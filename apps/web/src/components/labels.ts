import type { Condition, ListingKind } from "@fragrance/core";

export const KIND_LABELS: Record<ListingKind, string> = {
  full: "Full bottle",
  partial: "Partial",
  decant: "Decant",
};

export const CONDITION_LABELS: Record<Condition, string> = {
  new_sealed: "New, sealed",
  new_unsealed: "New, unsealed",
  used: "Used",
};
