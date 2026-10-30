import { describe, expect, it } from "vitest";
import { UNDER_AGE_CODE, idCheckOutcome, isAdult } from "./identity";

describe("isAdult", () => {
  const now = new Date("2026-10-30T12:00:00Z");

  it("is 18 on the birthday itself", () => {
    expect(isAdult({ day: 30, month: 10, year: 2008 }, now)).toBe(true);
  });

  it("is still 17 the day before", () => {
    expect(isAdult({ day: 31, month: 10, year: 2008 }, now)).toBe(false);
  });

  it("counts the month as well as the year", () => {
    expect(isAdult({ day: 1, month: 11, year: 2008 }, now)).toBe(false);
    expect(isAdult({ day: 1, month: 9, year: 2008 }, now)).toBe(true);
  });

  it("uses the UK date, not UTC", () => {
    // 23:30 UTC on 29 March 2026 is 00:30 on the 30th in the UK (BST).
    expect(isAdult({ day: 30, month: 3, year: 2008 }, new Date("2026-03-29T23:30:00Z"))).toBe(true);
  });

  it("handles someone born on 29 February", () => {
    expect(isAdult({ day: 29, month: 2, year: 2008 }, new Date("2026-02-28T12:00:00Z"))).toBe(false);
    expect(isAdult({ day: 29, month: 2, year: 2008 }, new Date("2026-03-01T12:00:00Z"))).toBe(true);
  });
});

describe("idCheckOutcome", () => {
  it("shows the start screen before a check", () => {
    expect(idCheckOutcome("not_started")).toEqual({ screen: "not_started", canRetry: true });
  });

  it("shows checking while Stripe works", () => {
    expect(idCheckOutcome("pending").screen).toBe("in_progress");
  });

  it("shows verified", () => {
    expect(idCheckOutcome("verified")).toEqual({ screen: "verified", canRetry: false });
  });

  it("asks for more information when the person can fix it", () => {
    const outcome = idCheckOutcome("needs_input", "document_expired");
    expect(outcome.screen).toBe("needs_input");
    expect(outcome.message).toMatch(/expired/);
    expect(outcome.canRetry).toBe(true);
  });

  it("has a fallback message for reasons it doesn't know", () => {
    expect(idCheckOutcome("needs_input", "something_new")).toMatchObject({ screen: "needs_input", canRetry: true });
    expect(idCheckOutcome("needs_input", null).message).toBeTruthy();
  });

  it("fails when the document or selfie didn't pass, but allows another try", () => {
    expect(idCheckOutcome("needs_input", "selfie_face_mismatch")).toMatchObject({ screen: "failed", canRetry: true });
  });

  it("fails without another try for someone under 18", () => {
    expect(idCheckOutcome("needs_input", UNDER_AGE_CODE)).toMatchObject({
      screen: "failed",
      message: "You must be 18 or over to sell or swap.",
      canRetry: false,
    });
    expect(idCheckOutcome("needs_input", "under_supported_age")).toMatchObject({ screen: "failed", canRetry: false });
  });
});
