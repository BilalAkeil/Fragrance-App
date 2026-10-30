import { describe, expect, it } from "vitest";
import { canBuy, isUkPostcode, normalisePostcode, reservationEndsAt, validateAddress } from "./checkout";

const now = new Date("2026-11-02T12:00:00Z");
const listing = { status: "active" as const, sellerId: "s1", kind: "full" as const, sizeMl: 100 };
const ready = { listing, buyerId: "b1", sellerPayoutsReady: true, now };

describe("canBuy", () => {
  it("lets a signed-in buyer buy an active listing", () => {
    expect(canBuy(ready)).toEqual([]);
  });

  it("refuses the seller's own listing and inactive ones (R-3, R-4)", () => {
    expect(canBuy({ ...ready, buyerId: "s1" })).toEqual(["own_listing"]);
    expect(canBuy({ ...ready, listing: { ...listing, status: "sold" } })).toEqual(["not_active"]);
  });

  it("needs a sign-in and a seller with payouts set up (AC-1.1, AC-3.1)", () => {
    expect(canBuy({ ...ready, buyerId: undefined })).toEqual(["signed_out"]);
    expect(canBuy({ ...ready, sellerPayoutsReady: false })).toEqual(["payouts_not_ready"]);
  });

  it("respects someone else's live reservation, but not an expired one or your own (AC-2.1)", () => {
    const later = new Date(now.getTime() + 60_000);
    expect(canBuy({ ...ready, reservation: { reservedBy: "b2", reservedUntil: later } })).toEqual(["reserved"]);
    expect(canBuy({ ...ready, reservation: { reservedBy: "b2", reservedUntil: now } })).toEqual([]);
    expect(canBuy({ ...ready, reservation: { reservedBy: "b1", reservedUntil: later } })).toEqual([]);
  });

  it("refuses what Royal Mail won't carry", () => {
    expect(canBuy({ ...ready, listing: { ...listing, sizeMl: 200 } })).toEqual(["cant_post"]);
  });
});

describe("reservationEndsAt", () => {
  it("is 31 minutes away, Stripe's 30-minute minimum plus a minute to create the session", () => {
    expect(reservationEndsAt(now).toISOString()).toBe("2026-11-02T12:31:00.000Z");
  });
});

describe("postcodes (R-8)", () => {
  it("normalises spacing and case", () => {
    expect(normalisePostcode(" sw1a1aa ")).toBe("SW1A 1AA");
    expect(normalisePostcode("m1  1ae")).toBe("M1 1AE");
  });

  it("accepts UK postcodes only", () => {
    for (const ok of ["SW1A 1AA", "m1 1ae", "EC1A1BB", "B33 8TH", "CR2 6XH", "DN55 1PT"]) expect(isUkPostcode(ok)).toBe(true);
    for (const bad of ["", "12345", "75001", "SW1A", "ABC 123"]) expect(isUkPostcode(bad)).toBe(false);
  });
});

describe("validateAddress", () => {
  it("lists what's missing", () => {
    expect(validateAddress({ name: "A", line1: "1 High St", town: "Leeds", postcode: "LS1 1AA" })).toEqual([]);
    expect(validateAddress({ name: "", line1: "", town: "", postcode: "75001" })).toHaveLength(4);
  });
});
