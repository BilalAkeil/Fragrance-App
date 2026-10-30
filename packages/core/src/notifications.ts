// In-app notifications (spec 010). 003 and 004 raise the order events now;
// 010 adds the rest, the emails and the notifications page.

export type NotificationEvent =
  | "order_paid" // to the buyer
  | "order_sold" // to the seller
  | "order_shipped" // to the buyer
  | "order_delivered" // to the buyer: the 48-hour window starts
  | "order_completed" // to both
  | "order_cancelled" // to both: not sent in time, refunded
  | "order_duplicate_refunded" // to the buyer who paid second (003 AC-2.2)
  | "payout_sent"; // to the seller

// The line shown in the notifications list.
export const NOTIFICATION_TEXT: Record<NotificationEvent, string> = {
  order_paid: "Your order is confirmed. The seller has 5 working days to send it.",
  order_sold: "You've sold an item. Print the label and send it within 5 working days.",
  order_shipped: "Your order is on its way.",
  order_delivered: "Your order has been delivered. Check it and tell us everything's OK within 48 hours.",
  order_completed: "Your order is complete.",
  order_cancelled: "An order was cancelled because it wasn't sent in time, and the buyer was refunded in full.",
  order_duplicate_refunded: "Someone else bought this item a moment before you, so your payment has been refunded in full.",
  payout_sent: "Your payout is on its way to your bank.",
};
