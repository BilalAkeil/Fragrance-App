// All money values are integer pence (GBP).

export type ListingKind = "full" | "partial" | "decant";

export type Condition = "new_sealed" | "new_unsealed" | "used";

// "draft" exists in the database but isn't used yet: listings go live when saved.
export type ListingStatus = "draft" | "active" | "sold" | "removed";

export interface Seller {
  id: string;
  displayName: string;
  idVerified: boolean;
  reviewCount: number;
  averageRating: number;
  // 003 AC-3.1: set once Stripe can pay them. Their listings can't be bought before.
  payoutsReady: boolean;
}

export interface SourceBottle {
  id: string;
  sellerId: string;
  house: string;
  name: string;
  sizeMl: number;
  // Set when the bottle is matched to the catalogue (002).
  fragranceId?: string;
  // Not every bottle has one.
  batchCode?: string;
  videoUrl: string;
  receiptUrl?: string;
  // Set once an admin has checked the video and batch code.
  verifiedAt?: string;
}

export interface Listing {
  id: string;
  sellerId: string;
  house: string;
  name: string;
  // Set when the listing is matched to the catalogue (002). Unmatched listings
  // keep only the house and name the seller typed.
  fragranceId?: string;
  houseId?: string;
  kind: ListingKind;
  sizeMl: number;
  // Only meaningful for partial bottles.
  fillPercent?: number;
  condition: Condition;
  // Not every bottle has one.
  batchCode?: string;
  pricePence: number;
  postagePence: number;
  receiptVerified: boolean;
  // Optional for decants. A checked bottle earns the "Verified source" badge.
  sourceBottleId?: string;
  status: ListingStatus;
  photos: string[];
  notes: string[];
  // 003 AC-2.1: someone is checking out this listing until then.
  reservedBy?: string;
  reservedUntil?: string;
}

export interface Review {
  id: string;
  orderId: string;
  sellerId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  text: string;
  createdAt: string;
}
