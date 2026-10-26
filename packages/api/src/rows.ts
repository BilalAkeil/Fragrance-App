import type { Listing, Seller, SourceBottle } from "@fragrance/core";

// Database rows as Supabase returns them (snake_case).

export interface SellerRow {
  id: string;
  display_name: string;
  id_verified: boolean;
}

export interface SellerRatingRow {
  seller_id: string;
  review_count: number;
  average_rating: string | number | null;
}

export interface SourceBottleRow {
  id: string;
  seller_id: string;
  house: string;
  name: string;
  size_ml: number;
  batch_code: string | null;
  video_path: string;
  receipt_path: string | null;
  verified_at: string | null;
}

export interface ListingRow {
  id: string;
  seller_id: string;
  house: string;
  name: string;
  kind: Listing["kind"];
  size_ml: number;
  fill_percent: number | null;
  condition: Listing["condition"];
  batch_code: string | null;
  price_pence: number;
  postage_pence: number;
  receipt_verified: boolean;
  source_bottle_id: string | null;
  notes: string[];
  status: Listing["status"];
  listing_photos?: { path: string; position: number }[];
}

export function toSeller(row: SellerRow, rating?: SellerRatingRow): Seller {
  return {
    id: row.id,
    displayName: row.display_name,
    idVerified: row.id_verified,
    reviewCount: rating ? Number(rating.review_count) : 0,
    averageRating: rating?.average_rating != null ? Number(rating.average_rating) : 0,
  };
}

export function toSourceBottle(row: SourceBottleRow): SourceBottle {
  return {
    id: row.id,
    sellerId: row.seller_id,
    house: row.house,
    name: row.name,
    sizeMl: row.size_ml,
    batchCode: row.batch_code ?? undefined,
    videoUrl: row.video_path,
    receiptUrl: row.receipt_path ?? undefined,
    verifiedAt: row.verified_at ?? undefined,
  };
}

export function toListing(row: ListingRow, photoUrl: (path: string) => string = (p) => p): Listing {
  return {
    id: row.id,
    sellerId: row.seller_id,
    house: row.house,
    name: row.name,
    kind: row.kind,
    sizeMl: row.size_ml,
    fillPercent: row.fill_percent ?? undefined,
    condition: row.condition,
    batchCode: row.batch_code ?? undefined,
    pricePence: row.price_pence,
    postagePence: row.postage_pence,
    receiptVerified: row.receipt_verified,
    sourceBottleId: row.source_bottle_id ?? undefined,
    photos: [...(row.listing_photos ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((p) => photoUrl(p.path)),
    notes: row.notes,
    status: row.status,
  };
}
