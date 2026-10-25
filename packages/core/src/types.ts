// All money values are integer pence (GBP).

export type ListingKind = "full" | "partial" | "decant";

export type Condition = "new_sealed" | "new_unsealed" | "used";

export interface Seller {
  id: string;
  displayName: string;
  idVerified: boolean;
  reviewCount: number;
  averageRating: number;
}

export interface SourceBottle {
  id: string;
  sellerId: string;
  house: string;
  name: string;
  sizeMl: number;
  batchCode: string;
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
  kind: ListingKind;
  sizeMl: number;
  // Only meaningful for partial bottles.
  fillPercent?: number;
  condition: Condition;
  batchCode: string;
  pricePence: number;
  postagePence: number;
  receiptVerified: boolean;
  // Required for decants.
  sourceBottleId?: string;
  photos: string[];
  notes: string[];
}

export interface Review {
  id: string;
  orderId: string;
  sellerId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  text: string;
  createdAt: string;
}
