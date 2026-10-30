import type { Listing } from "./types";

// The shared catalogue of houses, fragrances and bottle sizes (spec 002).
// Money values are integer pence (GBP).

export type Concentration = "edc" | "edt" | "edp" | "parfum" | "extrait" | "other";

export const CONCENTRATIONS: readonly Concentration[] = ["edc", "edt", "edp", "parfum", "extrait", "other"];

export const CONCENTRATION_LABELS: Record<Concentration, string> = {
  edc: "Eau de Cologne",
  edt: "Eau de Toilette",
  edp: "Eau de Parfum",
  parfum: "Parfum",
  extrait: "Extrait de Parfum",
  other: "Other",
};

export interface House {
  id: string;
  name: string;
  aliases: string[];
}

export interface Fragrance {
  id: string;
  houseId: string;
  name: string;
  concentration: Concentration;
  launchYear?: number;
  aliases: string[];
}

export interface FragranceSize {
  id: string;
  fragranceId: string;
  sizeMl: number;
  guidePricePence: number;
  // How many listings of this fragrance are this size. Decides the most common size (R-4).
  listingCount?: number;
  updatedAt?: string;
}

// The name copied onto a matched listing or bottle, so the concentration
// shows wherever the name does: "Sauvage Eau de Parfum".
export function fragranceDisplayName(fragrance: Pick<Fragrance, "name" | "concentration">): string {
  if (fragrance.concentration === "other") return fragrance.name;
  return `${fragrance.name} ${CONCENTRATION_LABELS[fragrance.concentration]}`;
}

// For matching typed text against catalogue names and aliases: lowercase,
// no accents, punctuation turned into spaces.
export function normaliseName(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// True when every word typed appears at the start of a word in the name or one of its aliases.
export function catalogueNameMatches(query: string, name: string, aliases: string[] = []): boolean {
  const words = normaliseName(query).split(" ").filter(Boolean);
  if (words.length === 0) return false;
  return [name, ...aliases].some((candidate) => {
    const candidateWords = normaliseName(candidate).split(" ");
    return words.every((w) => candidateWords.some((c) => c.startsWith(w)));
  });
}

// R-2: guide prices are integer pence, greater than 0.
export function guidePriceError(pence: number): string | undefined {
  if (!Number.isInteger(pence) || pence <= 0) return "Enter a guide price above £0.";
  return undefined;
}

// R-4: the most common size's guide price divided by its ml. The most common
// size is the one with the most listings; ties go to the larger size.
// Returns pence per ml, unrounded, or undefined when no size has a price.
export function guidePricePerMl(sizes: FragranceSize[]): number | undefined {
  const priced = sizes.filter((s) => s.guidePricePence > 0 && s.sizeMl > 0);
  if (priced.length === 0) return undefined;
  const common = priced.reduce((best, s) => {
    const count = s.listingCount ?? 0;
    const bestCount = best.listingCount ?? 0;
    if (count !== bestCount) return count > bestCount ? s : best;
    return s.sizeMl > best.sizeMl ? s : best;
  });
  return common.guidePricePence / common.sizeMl;
}

// AC-4: what a listing is worth for swaps. Undefined when it isn't matched to
// a fragrance, or the catalogue has no price for it (AC-4.4).
// `sizes` are the catalogue sizes of the listing's fragrance.
export function guideValuePence(
  listing: Pick<Listing, "kind" | "sizeMl" | "fillPercent" | "fragranceId">,
  sizes: FragranceSize[],
): number | undefined {
  if (!listing.fragranceId) return undefined;
  const own = sizes.filter((s) => s.fragranceId === listing.fragranceId);

  if (listing.kind === "decant") {
    const perMl = guidePricePerMl(own);
    return perMl === undefined ? undefined : Math.round(perMl * listing.sizeMl);
  }

  const size = own.find((s) => s.sizeMl === listing.sizeMl && s.guidePricePence > 0);
  if (!size) return undefined;
  if (listing.kind === "full") return size.guidePricePence;
  if (listing.fillPercent === undefined) return undefined;
  return Math.round((size.guidePricePence * listing.fillPercent) / 100);
}
