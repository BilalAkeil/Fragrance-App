import type { Listing, SourceBottle } from "./types";

export const MIN_DECANT_ML = 5;

export function remainingDecantMl(bottle: SourceBottle, usedMl: number): number {
  return Math.max(0, bottle.sizeMl - usedMl);
}

// usedMl = ml already listed or sold from this source bottle, excluding this listing.
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
  if (!bottle) {
    errors.push("Decants must link to a registered source bottle.");
    return errors;
  }
  if (bottle.sellerId !== listing.sellerId) {
    errors.push("The source bottle belongs to a different seller.");
  }
  if (!bottle.verifiedAt) {
    errors.push("The source bottle video has not been checked yet.");
  }
  const remaining = remainingDecantMl(bottle, usedMl);
  if (listing.sizeMl > remaining) {
    errors.push(`Only ${remaining}ml is left to decant from this ${bottle.sizeMl}ml bottle.`);
  }
  return errors;
}

export function decantLabel(listing: Listing, bottle: SourceBottle, decantedOn: string): string[] {
  return [
    bottle.house,
    bottle.name,
    `${listing.sizeMl}ml decant`,
    `Batch ${bottle.batchCode}`,
    `Decanted ${decantedOn}`,
  ];
}
