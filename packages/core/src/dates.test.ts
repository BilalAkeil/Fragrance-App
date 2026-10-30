import { describe, expect, it } from "vitest";
import { addWorkingDays, endOfUkDay, isWorkingDay, ukDate } from "./dates";

describe("ukDate", () => {
  it("uses the UK calendar date, not UTC", () => {
    // 23:30 UTC on 30 June is 00:30 on 1 July in British Summer Time.
    expect(ukDate(new Date("2026-06-30T23:30:00Z"))).toBe("2026-07-01");
    expect(ukDate(new Date("2026-12-31T23:30:00Z"))).toBe("2026-12-31");
  });
});

describe("isWorkingDay", () => {
  it("skips weekends and bank holidays", () => {
    expect(isWorkingDay("2026-11-02")).toBe(true); // Monday
    expect(isWorkingDay("2026-10-31")).toBe(false); // Saturday
    expect(isWorkingDay("2026-12-28")).toBe(false); // Boxing Day, moved to Monday
  });
});

describe("addWorkingDays", () => {
  it("counts from the next day, Monday to Friday", () => {
    // Paid Monday 2 Nov: 5 working days later is Monday 9 Nov.
    expect(addWorkingDays(new Date("2026-11-02T10:00:00Z"), 5)).toBe("2026-11-09");
    // Paid on a Saturday: the following Friday.
    expect(addWorkingDays(new Date("2026-10-31T10:00:00Z"), 5)).toBe("2026-11-06");
  });

  it("skips bank holidays", () => {
    // Paid Wednesday 23 Dec 2026: 24th, 29th, 30th, 31st, then 4 Jan (25th, 28th and 1 Jan are holidays).
    expect(addWorkingDays(new Date("2026-12-23T10:00:00Z"), 5)).toBe("2027-01-04");
    // Easter 2027: paid Thursday 25 March, Good Friday and Easter Monday don't count.
    expect(addWorkingDays(new Date("2027-03-25T10:00:00Z"), 5)).toBe("2027-04-05");
  });
});

describe("endOfUkDay", () => {
  it("is 23:59:59.999 in London, in winter and in summer", () => {
    expect(endOfUkDay("2026-11-09").toISOString()).toBe("2026-11-09T23:59:59.999Z");
    expect(endOfUkDay("2026-07-01").toISOString()).toBe("2026-07-01T22:59:59.999Z");
  });
});
