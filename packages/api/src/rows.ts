import type { Fragrance, FragranceSize, House, Listing, Seller, SourceBottle } from "@fragrance/core";

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
  fragrance_id?: string | null;
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
  fragrance_id?: string | null;
  // Embedded through fragrance_id, for the house filter.
  fragrances?: { house_id: string } | null;
  listing_photos?: { path: string; position: number }[];
}

export interface HouseRow {
  id: string;
  name: string;
  aliases: string[];
}

export interface FragranceRow {
  id: string;
  house_id: string;
  name: string;
  concentration: Fragrance["concentration"];
  launch_year: number | null;
  aliases: string[];
}

export interface FragranceSizeRow {
  id: string;
  fragrance_id: string;
  size_ml: number;
  guide_price_pence: number;
  updated_at: string;
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
    fragranceId: row.fragrance_id ?? undefined,
  };
}

export function toHouse(row: HouseRow): House {
  return { id: row.id, name: row.name, aliases: row.aliases };
}

export function toFragrance(row: FragranceRow): Fragrance {
  return {
    id: row.id,
    houseId: row.house_id,
    name: row.name,
    concentration: row.concentration,
    launchYear: row.launch_year ?? undefined,
    aliases: row.aliases,
  };
}

export function toFragranceSize(row: FragranceSizeRow, listingCount = 0): FragranceSize {
  return {
    id: row.id,
    fragranceId: row.fragrance_id,
    sizeMl: row.size_ml,
    guidePricePence: row.guide_price_pence,
    listingCount,
    updatedAt: row.updated_at,
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
    fragranceId: row.fragrance_id ?? undefined,
    houseId: row.fragrances?.house_id ?? undefined,
    photos: [...(row.listing_photos ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((p) => photoUrl(p.path)),
    notes: row.notes,
    status: row.status,
  };
}
