import { MIN_DECANT_ML } from "./decants";
import type { Condition, ListingKind, ListingStatus } from "./types";

export interface ListingInput {
  house: string;
  name: string;
  kind: ListingKind;
  sizeMl: number;
  fillPercent?: number;
  condition: Condition;
  // Optional: not every bottle has one.
  batchCode?: string;
  pricePence: number;
  postagePence: number;
  notes: string[];
  sourceBottleId?: string;
}

// "12.50" or "£12.50" -> 1250. Returns NaN for anything else.
export function parsePounds(text: string): number {
  const cleaned = text.trim().replace(/^£/, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return NaN;
  return Math.round(Number(cleaned) * 100);
}

export function parseNotes(text: string): string[] {
  return text
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
}

export function validateListingInput(input: ListingInput, photoCount: number): string[] {
  const errors: string[] = [];
  if (!input.house.trim()) errors.push("Add the brand.");
  if (!input.name.trim()) errors.push("Add the fragrance name.");
  if (!Number.isInteger(input.sizeMl) || input.sizeMl <= 0) errors.push("Add the size in ml.");
  if (!Number.isFinite(input.pricePence) || input.pricePence <= 0) errors.push("Add a price.");
  if (!Number.isFinite(input.postagePence) || input.postagePence < 0) {
    errors.push("Add the postage price, or 0 for free postage.");
  }
  if (input.kind === "partial") {
    const fill = input.fillPercent;
    if (fill === undefined || !Number.isInteger(fill) || fill < 1 || fill > 100) {
      errors.push("Add how full the bottle is, from 1 to 100%.");
    }
  }
  if (input.kind === "decant" && input.sizeMl < MIN_DECANT_ML) {
    errors.push(`Decants must be at least ${MIN_DECANT_ML}ml.`);
  }
  if (photoCount < 1) errors.push("Add at least one photo of the bottle.");
  return errors;
}

export function batchCodeLabel(batchCode?: string): string {
  const code = batchCode?.trim();
  return code ? `Batch ${code}` : "No batch code";
}

// Sold and removed listings are final.
export function canEditListing(status: ListingStatus, isOwner: boolean): boolean {
  return isOwner && (status === "active" || status === "draft");
}
