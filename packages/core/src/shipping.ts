import type { ListingKind } from "./types";

// Posting perfume (spec 004). Only Royal Mail Tracked 24 and 48 carry it (Q-2).

export type DeliveryService = "tracked24" | "tracked48";

export const DELIVERY_SERVICES: Record<DeliveryService, { name: string; description: string }> = {
  tracked24: { name: "Royal Mail Tracked 24", description: "Usually the next working day" },
  tracked48: { name: "Royal Mail Tracked 48", description: "Usually 2 to 3 working days" },
};

export const DELIVERY_SERVICE_IDS = Object.keys(DELIVERY_SERVICES) as DeliveryService[];

// R-6: Royal Mail's limits for perfume.
export const ROYAL_MAIL_MAX_ML = 150;
export const ROYAL_MAIL_MAX_ITEMS = 8;

export interface ParcelItem {
  kind: ListingKind;
  sizeMl: number;
}

export interface Parcel {
  sizeClass: "small" | "medium";
  weightGrams: number;
}

// Royal Mail's small parcel limit.
const SMALL_PARCEL_MAX_GRAMS = 2000;
// Rough packed weights (plan Q-4: from the listing, until sellers can weigh parcels).
const OUTER_BOX_GRAMS = 100;
const DECANT_VIAL_GRAMS = 30;
const BOTTLE_AND_BOX_GRAMS = 200;
// Perfume is a little lighter than water; glass makes up the rest.
const GRAMS_PER_ML = 1.5;

// An estimate of the parcel a seller will send, for pricing the label.
export function parcelFor(items: ParcelItem[]): Parcel {
  const weightGrams =
    OUTER_BOX_GRAMS +
    items.reduce(
      (sum, item) =>
        sum + (item.kind === "decant" ? DECANT_VIAL_GRAMS : BOTTLE_AND_BOX_GRAMS) + Math.round(item.sizeMl * GRAMS_PER_ML),
      0,
    );
  return { sizeClass: weightGrams <= SMALL_PARCEL_MAX_GRAMS ? "small" : "medium", weightGrams };
}

// R-6 and AC-1.2: why Royal Mail won't take this parcel, in plain words.
export function royalMailPerfumeProblems(items: ParcelItem[]): string[] {
  const problems: string[] = [];
  if (items.some((i) => i.sizeMl > ROYAL_MAIL_MAX_ML)) {
    problems.push(`Royal Mail only takes perfume bottles up to ${ROYAL_MAIL_MAX_ML}ml.`);
  }
  if (items.length > ROYAL_MAIL_MAX_ITEMS) {
    problems.push(`Royal Mail takes at most ${ROYAL_MAIL_MAX_ITEMS} perfumes in one parcel.`);
  }
  return problems;
}

// AC-2.2: what a seller needs to know before sending perfume.
export const PACKING_GUIDANCE: readonly string[] = [
  "Keep the bottle in its retail box, and put that inside a strong outer box with padding.",
  "Make sure the cap is on tightly. Tape over it if it's loose.",
  "Stick the label on the top of the outer box. It already carries the ID8000 mark Royal Mail needs for perfume.",
  "Hand it in at a Post Office counter, not a postbox.",
];
