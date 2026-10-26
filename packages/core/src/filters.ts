import { certificationStatus } from "./certification";
import { parsePounds } from "./listing-input";
import type { Condition, Listing, ListingKind, Seller } from "./types";

export interface ListingFilter {
  query?: string;
  kind?: ListingKind;
  condition?: Condition;
  minPence?: number;
  maxPence?: number;
  certifiedOnly?: boolean;
}

const KINDS: readonly ListingKind[] = ["full", "partial", "decant"];
const CONDITIONS: readonly Condition[] = ["new_sealed", "new_unsealed", "used"];

// Reads browse filters from URL search params (?q=&kind=&condition=&min=&max=&certified=1).
// Anything unrecognised is ignored rather than rejected.
export function listingFilterFromParams(params: Record<string, string | undefined>): ListingFilter {
  const filter: ListingFilter = {};
  const query = params.q?.trim();
  if (query) filter.query = query;
  if (KINDS.includes(params.kind as ListingKind)) filter.kind = params.kind as ListingKind;
  if (CONDITIONS.includes(params.condition as Condition)) filter.condition = params.condition as Condition;
  const min = params.min ? parsePounds(params.min) : NaN;
  const max = params.max ? parsePounds(params.max) : NaN;
  if (Number.isFinite(min)) filter.minPence = min;
  if (Number.isFinite(max)) filter.maxPence = max;
  if (params.certified === "1") filter.certifiedOnly = true;
  return filter;
}

export function matchesFilter(listing: Listing, seller: Seller | undefined, filter: ListingFilter): boolean {
  if (filter.kind && listing.kind !== filter.kind) return false;
  if (filter.condition && listing.condition !== filter.condition) return false;
  if (filter.minPence !== undefined && listing.pricePence < filter.minPence) return false;
  if (filter.maxPence !== undefined && listing.pricePence > filter.maxPence) return false;
  if (filter.certifiedOnly && (!seller || certificationStatus(seller) !== "certified")) return false;
  const query = filter.query?.trim().toLowerCase();
  if (query && ![listing.house, listing.name, ...listing.notes].some((s) => s.toLowerCase().includes(query))) {
    return false;
  }
  return true;
}
