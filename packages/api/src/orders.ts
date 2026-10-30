import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DeliveryService,
  ListingKind,
  Order,
  OrderStatus,
  Review,
  ShipToAddress,
  TrackingEvent,
} from "@fragrance/core";
import { REVIEW_COLUMNS, toReview, type ReviewRow } from "./rows";

// Reads for the order screens (004) and checkout (003). They take the signed-in
// user's own client, so RLS decides what comes back: an order only to its
// buyer, its seller and admins, and addresses only to their owner.

export interface OrderRow {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  status: OrderStatus;
  item_pence: number;
  postage_pence: number;
  protection_fee_pence: number;
  delivery_service: DeliveryService | null;
  ship_to: ShipToAddress | null;
  created_at: string;
  ship_by: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  complete_after: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  refunded_at?: string | null;
  listings: {
    house: string;
    name: string;
    kind: ListingKind;
    size_ml: number;
    listing_photos?: { path: string; position: number }[];
  } | null;
  shipments: { tracking_ref: string | null; tracking_events?: TrackingEvent[] } | null;
}

export const ORDER_COLUMNS =
  "id, listing_id, buyer_id, seller_id, status, item_pence, postage_pence, protection_fee_pence, delivery_service, ship_to, created_at, ship_by, shipped_at, delivered_at, complete_after, completed_at, cancelled_at, refunded_at, listings(house, name, kind, size_ml, listing_photos(path, position)), shipments(tracking_ref, tracking_events(at, status, description))";

export function toOrder(row: OrderRow, photoUrl: (path: string) => string = (p) => p): Order {
  const photo = [...(row.listings?.listing_photos ?? [])].sort((a, b) => a.position - b.position)[0];
  return {
    id: row.id,
    listingId: row.listing_id,
    item: {
      house: row.listings?.house ?? "",
      name: row.listings?.name ?? "",
      kind: row.listings?.kind ?? "full",
      sizeMl: row.listings?.size_ml ?? 0,
      photo: photo ? photoUrl(photo.path) : undefined,
    },
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    status: row.status,
    itemPence: row.item_pence,
    postagePence: row.postage_pence,
    protectionFeePence: row.protection_fee_pence,
    deliveryService: row.delivery_service ?? undefined,
    shipTo: row.ship_to ?? undefined,
    trackingRef: row.shipments?.tracking_ref ?? undefined,
    tracking: [...(row.shipments?.tracking_events ?? [])].sort((a, b) => a.at.localeCompare(b.at)),
    createdAt: row.created_at,
    shipBy: row.ship_by ?? undefined,
    shippedAt: row.shipped_at ?? undefined,
    deliveredAt: row.delivered_at ?? undefined,
    completeAfter: row.complete_after ?? undefined,
    completedAt: row.completed_at ?? undefined,
    cancelledAt: row.cancelled_at ?? undefined,
    refundedAt: row.refunded_at ?? undefined,
  };
}

const photoUrlFor = (client: SupabaseClient) => (path: string) =>
  client.storage.from("listing-photos").getPublicUrl(path).data.publicUrl;

// AC-5.1: the signed-in user's orders as buyer or seller, newest first.
export async function listOrders(client: SupabaseClient, userId: string, role: "buyer" | "seller"): Promise<Order[]> {
  const { data, error } = await client
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq(role === "buyer" ? "buyer_id" : "seller_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as OrderRow[]).map((r) => toOrder(r, photoUrlFor(client)));
}

export async function getOrder(client: SupabaseClient, id: string): Promise<Order | undefined> {
  const { data, error } = await client.from("orders").select(ORDER_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toOrder(data as unknown as OrderRow, photoUrlFor(client)) : undefined;
}

export interface SavedAddress extends ShipToAddress {
  id: string;
}

// AC-1.2: the buyer's saved delivery addresses, newest first.
export async function getAddresses(client: SupabaseClient): Promise<SavedAddress[]> {
  const { data, error } = await client
    .from("addresses")
    .select("id, name, line1, line2, town, postcode")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((a) => ({ ...a, line2: a.line2 ?? undefined }));
}

// 005 AC-2.1: the review left on an order, if any. Reviews are public.
export async function getOrderReview(client: SupabaseClient, orderId: string): Promise<Review | undefined> {
  const { data, error } = await client.from("reviews").select(REVIEW_COLUMNS).eq("order_id", orderId).maybeSingle();
  if (error) throw error;
  return data ? toReview(data as ReviewRow) : undefined;
}
