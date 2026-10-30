import { addWorkingDays, endOfUkDay } from "./dates";

// Orders after payment (spec 004): deadlines and the order state machine.

// R-1: the seller sends it within 5 working days of payment.
export const SHIP_BY_WORKING_DAYS = 5;
// R-3: the buyer has 48 hours after delivery to report a problem.
export const COMPLETION_WINDOW_HOURS = 48;
// 008 assumption (plan Q-5): "not received" can be reported this long after shipping.
export const NOT_RECEIVED_AFTER_DAYS = 7;

export type OrderStatus = "paid" | "shipped" | "delivered" | "completed" | "disputed" | "refunded" | "cancelled";

export type OrderEvent =
  | "scanned" // the carrier's first scan
  | "delivered" // the carrier's delivered scan
  | "everything_ok" // the buyer confirms
  | "window_ended" // 48 hours after delivery with no report
  | "not_shipped_in_time" // the ship-by deadline passed
  | "problem_reported" // the buyer reports a problem (008)
  | "decided_for_seller" // a dispute ends in the seller's favour (008)
  | "decided_for_buyer"; // a dispute ends in a refund (008)

// R-5: statuses only move forward. Anything not listed is refused.
const MOVES: Record<OrderStatus, Partial<Record<OrderEvent, OrderStatus>>> = {
  paid: {
    scanned: "shipped",
    // Tracking can skip straight to delivered when the first scan is missed.
    delivered: "delivered",
    not_shipped_in_time: "cancelled",
  },
  shipped: { delivered: "delivered" },
  delivered: { everything_ok: "completed", window_ended: "completed", problem_reported: "disputed" },
  disputed: { decided_for_seller: "completed", decided_for_buyer: "refunded" },
  completed: {},
  refunded: {},
  cancelled: {},
};

// The status after an event, or undefined when the event doesn't apply.
export function nextOrderStatus(status: OrderStatus, event: OrderEvent): OrderStatus | undefined {
  return MOVES[status][event];
}

// Every allowed move, for checking the database's copy of these rules agrees.
export function orderMoves(): { from: OrderStatus; event: OrderEvent; to: OrderStatus }[] {
  return (Object.keys(MOVES) as OrderStatus[]).flatMap((from) =>
    (Object.entries(MOVES[from]) as [OrderEvent, OrderStatus][]).map(([event, to]) => ({ from, event, to })),
  );
}

// R-1: the end of the 5th working day after payment, UK time. Bank holidays
// don't count (plan Q-3).
export function shipByFrom(paidAt: Date): Date {
  return endOfUkDay(addWorkingDays(paidAt, SHIP_BY_WORKING_DAYS));
}

// R-3: 48 hours after the delivered scan.
export function completeAfterFrom(deliveredAt: Date): Date {
  return new Date(deliveredAt.getTime() + COMPLETION_WINDOW_HOURS * 3_600_000);
}

// "2 days left", "5 hours left", "less than an hour left", or "overdue", for countdowns.
export function timeLeft(deadline: Date, now: Date): string {
  const ms = deadline.getTime() - now.getTime();
  if (ms <= 0) return "overdue";
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return "less than an hour left";
  if (hours < 48) return `${hours} ${hours === 1 ? "hour" : "hours"} left`;
  const days = Math.floor(hours / 24);
  return `${days} days left`;
}
