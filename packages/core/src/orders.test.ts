import { describe, expect, it } from "vitest";
import { completeAfterFrom, nextOrderStatus, orderMoves, shipByFrom, timeLeft } from "./orders";

describe("shipByFrom", () => {
  it("is the end of the 5th working day after payment, UK time (R-1)", () => {
    expect(shipByFrom(new Date("2026-11-02T10:00:00Z")).toISOString()).toBe("2026-11-09T23:59:59.999Z");
  });
});

describe("completeAfterFrom", () => {
  it("is 48 hours after delivery (R-3)", () => {
    expect(completeAfterFrom(new Date("2026-11-05T09:30:00Z")).toISOString()).toBe("2026-11-07T09:30:00.000Z");
  });
});

describe("nextOrderStatus", () => {
  it("moves forward Paid, Shipped, Delivered, Completed (R-5)", () => {
    expect(nextOrderStatus("paid", "scanned")).toBe("shipped");
    expect(nextOrderStatus("shipped", "delivered")).toBe("delivered");
    expect(nextOrderStatus("delivered", "everything_ok")).toBe("completed");
    expect(nextOrderStatus("delivered", "window_ended")).toBe("completed");
  });

  it("cancels an unshipped order, and handles disputes", () => {
    expect(nextOrderStatus("paid", "not_shipped_in_time")).toBe("cancelled");
    expect(nextOrderStatus("delivered", "problem_reported")).toBe("disputed");
    expect(nextOrderStatus("disputed", "decided_for_buyer")).toBe("refunded");
    expect(nextOrderStatus("disputed", "decided_for_seller")).toBe("completed");
  });

  it("refuses anything else", () => {
    expect(nextOrderStatus("shipped", "not_shipped_in_time")).toBeUndefined();
    expect(nextOrderStatus("paid", "everything_ok")).toBeUndefined();
    expect(nextOrderStatus("completed", "problem_reported")).toBeUndefined();
    expect(nextOrderStatus("cancelled", "scanned")).toBeUndefined();
  });

  it("lists every move", () => {
    expect(orderMoves()).toHaveLength(9);
  });
});

describe("timeLeft", () => {
  const now = new Date("2026-11-02T12:00:00Z");
  it("reads naturally", () => {
    expect(timeLeft(new Date("2026-11-05T12:00:00Z"), now)).toBe("3 days left");
    expect(timeLeft(new Date("2026-11-03T17:00:00Z"), now)).toBe("29 hours left");
    expect(timeLeft(new Date("2026-11-02T12:30:00Z"), now)).toBe("less than an hour left");
    expect(timeLeft(new Date("2026-11-02T11:00:00Z"), now)).toBe("overdue");
  });
});
