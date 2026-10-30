import { describe, expect, it } from "vitest";
import { UNDER_AGE_CODE, idCheckOutcome, idCheckStatus, isAdult } from "./identity";

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

describe("idCheckStatus", () => {
  const now = new Date("2026-10-30T12:00:00Z");
  const adult = { day: 1, month: 1, year: 1990 };

  it("follows payout setup until it's done", () => {
    expect(idCheckStatus("not_started", undefined, now).status).toBe("not_started");
    expect(idCheckStatus("in_progress", undefined, now).status).toBe("pending");
    expect(idCheckStatus("needs_info", adult, now).status).toBe("needs_input");
  });

  it("verifies an adult once payouts are ready", () => {
    expect(idCheckStatus("ready", adult, now)).toEqual({ status: "verified", errorCode: null });
  });

  it("refuses someone under 18 even when Stripe is happy", () => {
    expect(idCheckStatus("ready", { day: 31, month: 10, year: 2008 }, now)).toEqual({
      status: "needs_input",
      errorCode: UNDER_AGE_CODE,
    });
  });

  it("waits when the date of birth isn't there yet", () => {
    expect(idCheckStatus("ready", undefined, now).status).toBe("pending");
  });
});

describe("idCheckOutcome", () => {
  it("shows the start screen before a check", () => {
    expect(idCheckOutcome("not_started")).toEqual({ screen: "not_started", canRetry: true });
  });

  it("shows in progress, with a way to carry on", () => {
    expect(idCheckOutcome("pending")).toEqual({ screen: "in_progress", canRetry: true });
  });

  it("shows verified", () => {
    expect(idCheckOutcome("verified")).toEqual({ screen: "verified", canRetry: false });
  });

  it("asks for more information", () => {
    expect(idCheckOutcome("needs_input")).toMatchObject({ screen: "needs_input", canRetry: true });
  });

  it("fails without another try for someone under 18", () => {
    expect(idCheckOutcome("needs_input", UNDER_AGE_CODE)).toEqual({
      screen: "failed",
      message: "You must be 18 or over to sell or swap.",
      canRetry: false,
    });
  });
});
