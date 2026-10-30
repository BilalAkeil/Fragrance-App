import "server-only";
import type Stripe from "stripe";
import { parcelFor, shipByFrom, type DeliveryService, type ListingKind, type OrderEvent } from "@fragrance/core";
import { notify } from "@/lib/notify";
import { shippingProvider, type ShipTo, type TrackingUpdate } from "@/lib/shipping";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

// What the platform does to orders (003 and 004). Everything here runs with the
// service client, from webhooks, the scheduled job, or a server action that has
// already checked who is asking. Each step is safe to run twice.

export interface OrderRow {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  item_pence: number;
  postage_pence: number;
  protection_fee_pence: number;
  status: string;
  delivery_service: DeliveryService | null;
  ship_to: ShipTo | null;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  stripe_transfer_id: string | null;
  stripe_refund_id: string | null;
}

const ORDER_COLUMNS =
  "id, listing_id, buyer_id, seller_id, item_pence, postage_pence, protection_fee_pence, status, delivery_service, ship_to, stripe_payment_intent_id, stripe_charge_id, stripe_transfer_id, stripe_refund_id";

const orderLink = (id: string) => `/orders/${id}`;

async function loadOrder(orderId: string): Promise<OrderRow> {
  const { data, error } = await createServiceClient().from("orders").select(ORDER_COLUMNS).eq("id", orderId).single();
  if (error) throw new Error(`Order ${orderId}: ${error.message}`);
  return data as OrderRow;
}

// The only way an order's status changes (R-5). Returns false if the event no
// longer applies, for example when the buyer confirmed just before the job ran.
export async function transitionOrder(orderId: string, event: OrderEvent, at = new Date()): Promise<boolean> {
  const { error } = await createServiceClient().rpc("transition_order", {
    order_id: orderId,
    event,
    at: at.toISOString(),
  });
  if (error?.message.includes("can't take")) return false;
  if (error) throw new Error(error.message);
  return true;
}

// The metadata startCheckout puts on a Checkout Session.
export interface CheckoutMetadata {
  listingId: string;
  buyerId: string;
  sellerId: string;
  service: DeliveryService;
  itemPence: string;
  postagePence: string;
  feePence: string;
  shipTo: string;
}

// checkout.session.completed (003): creates the order, marks the listing sold
// and makes the label. A second payment for a listing that's already sold is
// refunded in full (AC-2.2).
export async function createOrderFromCheckout(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return;
  const md = session.metadata as unknown as CheckoutMetadata;
  const db = createServiceClient();

  const { data: existing } = await db.from("orders").select("id").eq("stripe_checkout_session_id", session.id).maybeSingle();
  if (existing) return;

  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  if (!paymentIntentId) throw new Error(`Session ${session.id} has no payment`);
  const paymentIntent = await stripe().paymentIntents.retrieve(paymentIntentId);
  const chargeId = typeof paymentIntent.latest_charge === "string" ? paymentIntent.latest_charge : paymentIntent.latest_charge?.id;

  const paidAt = new Date();
  const { data: order, error } = await db
    .from("orders")
    .insert({
      listing_id: md.listingId,
      buyer_id: md.buyerId,
      seller_id: md.sellerId,
      item_pence: Number(md.itemPence),
      postage_pence: Number(md.postagePence),
      protection_fee_pence: Number(md.feePence),
      delivery_service: md.service,
      ship_to: JSON.parse(md.shipTo),
      status: "paid",
      paid_at: paidAt.toISOString(),
      ship_by: shipByFrom(paidAt).toISOString(),
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      stripe_charge_id: chargeId ?? null,
    })
    .select("id")
    .single();

  if (error?.code === "23505" && error.message.includes("orders_one_per_listing")) {
    // Someone else's payment for this listing got there first.
    await stripe().refunds.create({ payment_intent: paymentIntentId }, { idempotencyKey: `duplicate-${session.id}` });
    await notify(md.buyerId, "order_duplicate_refunded", md.listingId, `/listings/${md.listingId}`);
    return;
  }
  if (error) throw new Error(`Creating the order for ${session.id}: ${error.message}`);

  // R-6: the listing is sold and the reservation ends. Open swap proposals that
  // include it close here once 007 exists.
  const { error: soldError } = await db
    .from("listings")
    .update({ status: "sold", reserved_by: null, reserved_until: null })
    .eq("id", md.listingId);
  if (soldError) throw new Error(`Marking ${md.listingId} sold: ${soldError.message}`);

  try {
    await createShipment(order.id);
  } catch (err) {
    // The label is made again when the seller opens it, so this isn't fatal.
    console.error(`Label for order ${order.id} failed:`, err);
  }
  await notify(md.buyerId, "order_paid", order.id, orderLink(order.id));
  await notify(md.sellerId, "order_sold", order.id, orderLink(order.id));
}

// checkout.session.expired (003): frees the listing if this buyer still holds it.
export async function releaseReservation(listingId: string, buyerId: string) {
  await createServiceClient()
    .from("listings")
    .update({ reserved_by: null, reserved_until: null })
    .eq("id", listingId)
    .eq("reserved_by", buyerId);
}

// 004 AC-2.1: the order's shipment and label. Returns the existing one if there is one.
export async function createShipment(orderId: string) {
  const db = createServiceClient();
  const { data: existing } = await db.from("shipments").select("*").eq("order_id", orderId).maybeSingle();
  if (existing) return existing;

  const order = await loadOrder(orderId);
  if (!order.delivery_service || !order.ship_to) throw new Error(`Order ${orderId} has no delivery details`);
  const { data: listing } = await db.from("listings").select("kind, size_ml").eq("id", order.listing_id).single();
  const provider = shippingProvider();
  const label = await provider.createLabel({
    orderId,
    service: order.delivery_service,
    parcel: parcelFor([{ kind: listing!.kind as ListingKind, sizeMl: listing!.size_ml }]),
    shipTo: order.ship_to,
  });
  const { data, error } = await db
    .from("shipments")
    .upsert(
      {
        order_id: orderId,
        service: order.delivery_service,
        provider: provider.name,
        provider_ref: label.providerRef,
        tracking_ref: label.trackingRef,
        label_ref: label.labelRef,
      },
      { onConflict: "order_id" },
    )
    .select("*")
    .single();
  if (error) throw new Error(`Saving the shipment for ${orderId}: ${error.message}`);
  return data;
}

// 004 AC-3: stores a tracking update and moves the order along.
export async function applyTrackingUpdate(update: TrackingUpdate) {
  const db = createServiceClient();
  const { data: shipment } = await db
    .from("shipments")
    .select("id, order_id")
    .eq("tracking_ref", update.trackingRef)
    .maybeSingle();
  if (!shipment) throw new Error(`No shipment with tracking ${update.trackingRef}`);

  await db.from("tracking_events").upsert(
    { shipment_id: shipment.id, at: update.at.toISOString(), status: update.status, description: update.description },
    { onConflict: "shipment_id,at,status", ignoreDuplicates: true },
  );

  const order = await loadOrder(shipment.order_id);
  if (update.status === "scanned" || update.status === "in_transit") {
    if (order.status === "paid" && (await transitionOrder(order.id, "scanned", update.at))) {
      await notify(order.buyer_id, "order_shipped", order.id, orderLink(order.id));
    }
  } else if (update.status === "delivered") {
    if (await transitionOrder(order.id, "delivered", update.at)) {
      await notify(order.buyer_id, "order_delivered", order.id, orderLink(order.id));
    }
  }
}

// 004 AC-4.1 and AC-4.3: completes a delivered order and pays the seller.
export async function completeOrder(orderId: string, event: "everything_ok" | "window_ended") {
  if (!(await transitionOrder(orderId, event))) return false;
  const order = await loadOrder(orderId);
  await notify(order.buyer_id, "order_completed", orderId, orderLink(orderId));
  await notify(order.seller_id, "order_completed", orderId, orderLink(orderId));
  await transferToSeller(order);
  return true;
}

// 004 AC-2.3: an order not sent in time is cancelled and refunded in full. The
// listing stays sold.
export async function cancelUnshippedOrder(orderId: string) {
  if (!(await transitionOrder(orderId, "not_shipped_in_time"))) return false;
  const order = await loadOrder(orderId);
  await refundOrder(order);
  await notify(order.buyer_id, "order_cancelled", orderId, orderLink(orderId));
  await notify(order.seller_id, "order_cancelled", orderId, orderLink(orderId));
  return true;
}

// 003 AC-3.2: pays the seller the item price (R-2), from this order's own charge.
export async function transferToSeller(order: OrderRow) {
  if (order.stripe_transfer_id) return;
  const db = createServiceClient();
  const { data: seller } = await db.from("sellers").select("stripe_account_id").eq("id", order.seller_id).single();
  if (!seller?.stripe_account_id) throw new Error(`Seller ${order.seller_id} has no payouts account`);
  const transfer = await stripe().transfers.create(
    {
      amount: order.item_pence,
      currency: "gbp",
      destination: seller.stripe_account_id,
      transfer_group: order.listing_id,
      ...(order.stripe_charge_id ? { source_transaction: order.stripe_charge_id } : {}),
    },
    { idempotencyKey: `transfer-${order.id}` },
  );
  await db.from("orders").update({ stripe_transfer_id: transfer.id }).eq("id", order.id);
  await notify(order.seller_id, "payout_sent", order.id, orderLink(order.id), { amountPence: order.item_pence });
}

// Refunds an order, in full unless an amount is given (004 cancellations, 008 disputes).
export async function refundOrder(order: OrderRow, amountPence?: number) {
  if (order.stripe_refund_id || !order.stripe_payment_intent_id) return;
  const refund = await stripe().refunds.create(
    { payment_intent: order.stripe_payment_intent_id, ...(amountPence ? { amount: amountPence } : {}) },
    { idempotencyKey: `refund-${order.id}-${amountPence ?? "full"}` },
  );
  await createServiceClient().from("orders").update({ stripe_refund_id: refund.id }).eq("id", order.id);
}

// For the scheduled job: money steps that failed part-way are retried.
export async function retryUnfinishedMoney() {
  const db = createServiceClient();
  const [{ data: unrefunded }, { data: unpaid }] = await Promise.all([
    db.from("orders").select(ORDER_COLUMNS).eq("status", "cancelled").is("stripe_refund_id", null),
    db.from("orders").select(ORDER_COLUMNS).eq("status", "completed").is("stripe_transfer_id", null),
  ]);
  for (const order of (unrefunded ?? []) as OrderRow[]) await refundOrder(order);
  for (const order of (unpaid ?? []) as OrderRow[]) await transferToSeller(order);
  return { refunds: unrefunded?.length ?? 0, transfers: unpaid?.length ?? 0 };
}
