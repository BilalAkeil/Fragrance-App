import type { Listing, SourceBottle } from "./types";

export const MIN_DECANT_ML = 5;

export function remainingDecantMl(bottle: SourceBottle, usedMl: number): number {
  return Math.max(0, bottle.sizeMl - usedMl);
}

// usedMl = ml already listed or sold from this source bottle, excluding this listing.
// Linking a source bottle is optional; when one is linked it must be the
// seller's own and have room left.
export function validateDecantListing(
  listing: Listing,
  bottle: SourceBottle | undefined,
  usedMl: number,
): string[] {
  const errors: string[] = [];
  if (listing.kind !== "decant") return errors;
  if (listing.sizeMl < MIN_DECANT_ML) {
    errors.push(`Decants must be at least ${MIN_DECANT_ML}ml.`);
  }
  if (!bottle) return errors;
  if (bottle.sellerId !== listing.sellerId) {
    errors.push("The source bottle belongs to a different seller.");
  }
  const remaining = remainingDecantMl(bottle, usedMl);
  if (listing.sizeMl > remaining) {
    errors.push(`Only ${remaining}ml is left to decant from this ${bottle.sizeMl}ml bottle.`);
  }
  return errors;
}

// The "Verified source" badge: a decant linked to the seller's own bottle
// whose video our team has checked.
export function hasVerifiedSource(listing: Listing, bottle: SourceBottle | undefined): boolean {
  return (
    listing.kind === "decant" &&
    bottle !== undefined &&
    bottle.id === listing.sourceBottleId &&
    bottle.sellerId === listing.sellerId &&
    Boolean(bottle.verifiedAt)
  );
}

export function decantLabel(listing: Listing, bottle: SourceBottle | undefined, decantedOn: string): string[] {
  const batchCode = bottle?.batchCode ?? listing.batchCode;
  return [
    bottle?.house ?? listing.house,
    bottle?.name ?? listing.name,
    `${listing.sizeMl}ml decant`,
    ...(batchCode ? [`Batch ${batchCode}`] : []),
    `Decanted ${decantedOn}`,
  ];
}
