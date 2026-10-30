import { describe, expect, it } from "vitest";
import { REVIEW_WINDOW_DAYS, canReview, isRating, orderEndedAt, reviewWindowEnds } from "./reviews";

const endedAt = new Date("2026-10-01T12:00:00Z");
const day = 24 * 60 * 60 * 1000;

describe("canReview", () => {
  const base = { status: "completed" as const, endedAt, alreadyReviewed: false, now: new Date(endedAt.getTime() + day) };

  it("allows a completed order", () => {
    expect(canReview(base)).toBe(true);
  });

  it("allows an order refunded after a dispute (AC-2.3)", () => {
    expect(canReview({ ...base, status: "refunded" })).toBe(true);
  });

  it("refuses an order that's only delivered", () => {
    expect(canReview({ ...base, status: "delivered" })).toBe(false);
  });

  it("refuses unfinished and cancelled orders", () => {
    for (const status of ["paid", "shipped", "disputed", "cancelled"] as const) {
      expect(canReview({ ...base, status })).toBe(false);
    }
  });

  it("refuses a second review (R-5)", () => {
    expect(canReview({ ...base, alreadyReviewed: true })).toBe(false);
  });

  it(`closes ${REVIEW_WINDOW_DAYS} days after the order ends (AC-2.2)`, () => {
    const closes = reviewWindowEnds(endedAt).getTime();
    expect(closes - endedAt.getTime()).toBe(REVIEW_WINDOW_DAYS * day);
    expect(canReview({ ...base, now: new Date(closes - 1) })).toBe(true);
    expect(canReview({ ...base, now: new Date(closes) })).toBe(false);
  });

  it("needs to know when the order ended", () => {
    expect(canReview({ ...base, endedAt: undefined })).toBe(false);
  });
});

describe("isRating", () => {
  it("accepts whole stars from 1 to 5", () => {
    expect([1, 2, 3, 4, 5].every(isRating)).toBe(true);
    expect([0, 6, 4.5, Number.NaN].some(isRating)).toBe(false);
  });
});

describe("orderEndedAt", () => {
  const completedAt = "2026-10-01T12:00:00Z";
  const refundedAt = "2026-10-05T12:00:00Z";

  it("is when a completed order completed", () => {
    expect(orderEndedAt({ status: "completed", completedAt })).toEqual(new Date(completedAt));
  });

  it("is when a disputed order was refunded", () => {
    expect(orderEndedAt({ status: "refunded", refundedAt })).toEqual(new Date(refundedAt));
  });

  it("is nothing for an order that hasn't ended", () => {
    expect(orderEndedAt({ status: "delivered", completedAt })).toBeUndefined();
  });
});
