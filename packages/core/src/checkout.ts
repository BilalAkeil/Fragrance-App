import { royalMailPerfumeProblems } from "./shipping";
import type { Listing } from "./types";

// Buying a listing (spec 003).

// Plan Q-3: a Stripe Checkout Session can't expire sooner than 30 minutes, and
// it expires with the reservation. The extra minute covers the time it takes
// to create the session after reserving.
export const RESERVATION_MINUTES = 31;

export function reservationEndsAt(now: Date): Date {
  return new Date(now.getTime() + RESERVATION_MINUTES * 60_000);
}

export type CannotBuyReason = "signed_out" | "own_listing" | "not_active" | "payouts_not_ready" | "reserved" | "cant_post";

export const CANNOT_BUY_MESSAGES: Record<CannotBuyReason, string> = {
  signed_out: "Sign in to buy this.",
  own_listing: "This is your listing.",
  not_active: "This item is no longer available.",
  payouts_not_ready: "This seller is still setting up payouts, so it can't be bought yet.",
  reserved: "Someone is checking out this item. Try again in a few minutes.",
  cant_post: "This can't be sent by Royal Mail, so it can't be bought here.",
};

export interface Reservation {
  reservedBy?: string;
  reservedUntil?: Date;
}

// R-3, R-4, AC-2.1, AC-3.1: why this buyer can't buy this listing right now.
// An empty list means they can. Their own reservation doesn't stop them.
export function canBuy({
  listing,
  buyerId,
  sellerPayoutsReady,
  reservation,
  now,
}: {
  listing: Pick<Listing, "status" | "sellerId" | "kind" | "sizeMl">;
  buyerId?: string;
  sellerPayoutsReady: boolean;
  reservation?: Reservation;
  now: Date;
}): CannotBuyReason[] {
  if (listing.status !== "active") return ["not_active"];
  const reasons: CannotBuyReason[] = [];
  if (royalMailPerfumeProblems([listing]).length > 0) reasons.push("cant_post");
  if (!sellerPayoutsReady) reasons.push("payouts_not_ready");
  if (!buyerId) reasons.push("signed_out");
  else if (buyerId === listing.sellerId) reasons.push("own_listing");
  const reservedByOther =
    reservation?.reservedBy !== undefined &&
    reservation.reservedBy !== buyerId &&
    reservation.reservedUntil !== undefined &&
    reservation.reservedUntil > now;
  if (reservedByOther) reasons.push("reserved");
  return reasons;
}

// R-8: UK postcodes, for example "SW1A 1AA", "m1 1ae" or "EC1A1BB".
const UK_POSTCODE = /^([A-Z]{1,2}[0-9][A-Z0-9]?) ?([0-9][A-Z]{2})$/;

// Upper case, with one space before the last three characters.
export function normalisePostcode(text: string): string {
  const compact = text.toUpperCase().replace(/\s+/g, "");
  return compact.length > 3 ? `${compact.slice(0, -3)} ${compact.slice(-3)}` : compact;
}

export function isUkPostcode(text: string): boolean {
  return UK_POSTCODE.test(normalisePostcode(text));
}

export interface AddressInput {
  name: string;
  line1: string;
  line2?: string;
  town: string;
  postcode: string;
}

// What's wrong with a delivery address, in plain words (AC-1.2, R-8).
export function validateAddress(address: AddressInput): string[] {
  const errors: string[] = [];
  if (!address.name.trim()) errors.push("Add the name to deliver to.");
  if (!address.line1.trim()) errors.push("Add the first line of the address.");
  if (!address.town.trim()) errors.push("Add the town or city.");
  if (!isUkPostcode(address.postcode)) errors.push("Enter a UK postcode, for example SW1A 1AA.");
  return errors;
}
