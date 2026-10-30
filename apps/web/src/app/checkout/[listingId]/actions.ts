"use server";

import { headers } from "next/headers";
import {
  CANNOT_BUY_MESSAGES,
  DELIVERY_SERVICES,
  canBuy,
  checkoutBreakdown,
  normalisePostcode,
  parcelFor,
  reservationEndsAt,
  validateAddress,
  type AddressInput,
  type DeliveryService,
  type ListingKind,
} from "@fragrance/core";
import { KIND_LABELS } from "@/components/labels";
import type { CheckoutMetadata } from "@/lib/orders";
import { shippingProvider, type Quote, type ShipTo } from "@/lib/shipping";
import { stripe, stripeConfigured } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

// Checkout (003). Prices always come from the database and the shipping
// provider here on the server, never from the browser.

interface CheckoutListing {
  id: string;
  seller_id: string;
  house: string;
  name: string;
  kind: ListingKind;
  size_ml: number;
  price_pence: number;
  status: "draft" | "active" | "sold" | "removed";
  reserved_by: string | null;
  reserved_until: string | null;
  sellers: { payouts_ready: boolean } | null;
}

async function loadListing(listingId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select("id, seller_id, house, name, kind, size_ml, price_pence, status, reserved_by, reserved_until, sellers(payouts_ready)")
    .eq("id", listingId)
    .maybeSingle();
  return data as unknown as CheckoutListing | null;
}

function blockers(listing: CheckoutListing, buyerId: string | undefined) {
  return canBuy({
    listing: { status: listing.status, sellerId: listing.seller_id, kind: listing.kind, sizeMl: listing.size_ml },
    buyerId,
    sellerPayoutsReady: Boolean(listing.sellers?.payouts_ready),
    reservation: {
      reservedBy: listing.reserved_by ?? undefined,
      reservedUntil: listing.reserved_until ? new Date(listing.reserved_until) : undefined,
    },
    now: new Date(),
  });
}

async function quotesFor(listing: CheckoutListing, toPostcode: string): Promise<Quote[]> {
  // The seller's dispatch postcode is private, so it's read with the service client.
  const { data: settings } = await createServiceClient()
    .from("seller_settings")
    .select("dispatch_postcode")
    .eq("seller_id", listing.seller_id)
    .maybeSingle();
  return shippingProvider().quote(
    parcelFor([{ kind: listing.kind, sizeMl: listing.size_ml }]),
    settings?.dispatch_postcode ?? undefined,
    normalisePostcode(toPostcode),
  );
}

// 004 AC-1.1: the delivery choices and prices for this listing to this postcode.
export async function getDeliveryQuotes(
  listingId: string,
  postcode: string,
): Promise<{ quotes: Quote[] } | { error: string }> {
  const listing = await loadListing(listingId);
  if (!listing) return { error: CANNOT_BUY_MESSAGES.not_active };
  try {
    const quotes = await quotesFor(listing, postcode);
    return quotes.length ? { quotes } : { error: "No delivery services can reach this address." };
  } catch {
    return { error: "We couldn't get delivery prices just now. Please try again." };
  }
}

export interface StartCheckoutInput {
  listingId: string;
  // A saved address, or a new one.
  addressId?: string;
  address?: AddressInput;
  saveAddress?: boolean;
  service: DeliveryService;
}

// AC-1.2 to AC-1.4: reserves the listing and opens an embedded Stripe Checkout
// Session for item, postage and Buyer Protection.
export async function startCheckout(
  input: StartCheckoutInput,
): Promise<{ clientSecret: string; sessionId: string } | { errors: string[] }> {
  if (!stripeConfigured) return { errors: ["Payments aren't set up on this site yet."] };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const listing = await loadListing(input.listingId);
  if (!listing) return { errors: [CANNOT_BUY_MESSAGES.not_active] };
  const reasons = blockers(listing, user?.id);
  if (!user || reasons.length) return { errors: reasons.map((r) => CANNOT_BUY_MESSAGES[r]) };
  if (!DELIVERY_SERVICES[input.service]) return { errors: ["Choose a delivery service."] };

  // The delivery address (R-8: UK only).
  let shipTo: ShipTo;
  if (input.addressId) {
    const { data } = await supabase
      .from("addresses")
      .select("name, line1, line2, town, postcode")
      .eq("id", input.addressId)
      .maybeSingle();
    if (!data) return { errors: ["Choose a delivery address."] };
    shipTo = { ...data, line2: data.line2 ?? undefined };
  } else if (input.address) {
    const trimmed = Object.fromEntries(
      Object.entries(input.address).map(([k, v]) => [k, typeof v === "string" ? v.trim().slice(0, 100) : v]),
    ) as unknown as AddressInput;
    const errors = validateAddress(trimmed);
    if (errors.length) return { errors };
    shipTo = { ...trimmed, line2: trimmed.line2 || undefined, postcode: normalisePostcode(trimmed.postcode) };
    if (input.saveAddress) await supabase.from("addresses").insert({ ...shipTo, line2: shipTo.line2 ?? null });
  } else {
    return { errors: ["Add a delivery address."] };
  }

  const quote = (await quotesFor(listing, shipTo.postcode)).find((q) => q.service === input.service);
  if (!quote) return { errors: ["That delivery service isn't available for this address."] };
  const price = checkoutBreakdown(listing.price_pence, quote.pricePence);

  // AC-2.1: hold the listing while this buyer pays.
  const until = reservationEndsAt(new Date());
  const { data: reserved, error: reserveError } = await supabase.rpc("reserve_listing", {
    listing_id: listing.id,
    until: until.toISOString(),
  });
  if (reserveError || !reserved) return { errors: [CANNOT_BUY_MESSAGES.reserved] };

  const metadata: CheckoutMetadata = {
    listingId: listing.id,
    buyerId: user.id,
    sellerId: listing.seller_id,
    service: input.service,
    itemPence: String(price.itemPence),
    postagePence: String(price.postagePence),
    feePence: String(price.protectionFeePence),
    shipTo: JSON.stringify(shipTo),
  };
  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const line = (name: string, pence: number) => ({
    quantity: 1,
    price_data: { currency: "gbp", unit_amount: pence, product_data: { name } },
  });
  try {
    const session = await stripe().checkout.sessions.create({
      ui_mode: "embedded",
      mode: "payment",
      customer_email: user.email,
      line_items: [
        line(`${listing.house} ${listing.name}, ${listing.size_ml}ml ${KIND_LABELS[listing.kind].toLowerCase()}`, price.itemPence),
        line(DELIVERY_SERVICES[input.service].name, price.postagePence),
        line("Buyer Protection", price.protectionFeePence),
      ],
      // The money stays with the platform until the order completes (R-7).
      payment_intent_data: { transfer_group: listing.id, metadata: { ...metadata } },
      metadata: { ...metadata },
      expires_at: Math.floor(until.getTime() / 1000),
      return_url: `${origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
    });
    return { clientSecret: session.client_secret!, sessionId: session.id };
  } catch (err) {
    console.error("Creating the checkout session failed:", err);
    await cancelCheckout(listing.id);
    return { errors: ["We couldn't start the payment. Please try again."] };
  }
}

// AC-1.6: the buyer backs out, so the listing is free again straight away.
export async function cancelCheckout(listingId: string, sessionId?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  if (sessionId && stripeConfigured) {
    try {
      // Only this buyer's own session for this listing.
      const session = await stripe().checkout.sessions.retrieve(sessionId);
      if (session.metadata?.buyerId === user.id && session.metadata?.listingId === listingId && session.status === "open") {
        await stripe().checkout.sessions.expire(sessionId);
      }
    } catch {
      // Already paid or expired: the webhook handles it.
    }
  }
  await createServiceClient()
    .from("listings")
    .update({ reserved_by: null, reserved_until: null })
    .eq("id", listingId)
    .eq("reserved_by", user.id)
    .eq("status", "active");
}
