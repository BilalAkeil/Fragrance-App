import type { Condition, ListingKind, OrderStatus } from "@fragrance/core";

export const KIND_LABELS: Record<ListingKind, string> = {
  full: "Full bottle",
  partial: "Partial",
  decant: "Decant",
};

export const CONDITION_LABELS: Record<Condition, string> = {
  new_sealed: "New, sealed",
  new_unsealed: "New, unsealed",
  used: "Used",
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  paid: "Paid",
  shipped: "Shipped",
  delivered: "Delivered",
  completed: "Completed",
  disputed: "Problem reported",
  refunded: "Refunded",
  cancelled: "Cancelled",
};
