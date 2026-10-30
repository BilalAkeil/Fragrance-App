import type { Order, OrderStatus } from "./orders";

// Reviews after an order or swap (spec 005, US-2 and US-3).

// Q-3 (settled: copy Vinted): a review can be left up to 4 days after the order
// ends. The database's insert policy uses the same number.
export const REVIEW_WINDOW_DAYS = 4;

export type Rating = 1 | 2 | 3 | 4 | 5;

export function isRating(n: number): n is Rating {
  return Number.isInteger(n) && n >= 1 && n <= 5;
}

// The most a review or a reply can say. The database checks the same limit.
export const REVIEW_TEXT_MAX = 1000;

// When the review window closes for an order that ended at `endedAt`.
export function reviewWindowEnds(endedAt: Date): Date {
  return new Date(endedAt.getTime() + REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

// R-5, AC-2.2, AC-2.3: the buyer can review a completed order, or one refunded
// after a dispute, once, within the window. `endedAt` is when it completed or
// was refunded.
export function canReview(order: {
  status: OrderStatus;
  endedAt?: Date;
  alreadyReviewed: boolean;
  now: Date;
}): boolean {
  if (order.alreadyReviewed || !order.endedAt) return false;
  if (order.status !== "completed" && order.status !== "refunded") return false;
  return order.now < reviewWindowEnds(order.endedAt);
}

// When an order ended for reviewing: when it completed, or was refunded after a dispute.
export function orderEndedAt(order: Pick<Order, "status" | "completedAt" | "refundedAt">): Date | undefined {
  const at = order.status === "completed" ? order.completedAt : order.status === "refunded" ? order.refundedAt : undefined;
  return at ? new Date(at) : undefined;
}

// Q-3 (settled: copy Vinted): the person reviewed can reply, once.
export function canReply(review: { revieweeId: string; reply?: unknown }, userId: string): boolean {
  return review.revieweeId === userId && !review.reply;
}
