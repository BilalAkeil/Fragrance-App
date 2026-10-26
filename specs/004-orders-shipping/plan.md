# 004: Orders and shipping — plan

How we'll build [spec.md](spec.md). Shared design: [docs/architecture.md](../../docs/architecture.md). Built together with [003](../003-checkout/plan.md).

## Approach

- **Royal Mail Tracked 24 and 48 only**, behind the `ShippingProvider` interface. A `fake` provider lets us build and test everything before the broker is chosen (Q-1: Sendcloud or Royal Mail direct).
- **Shipments:** each order gets one shipment, created as soon as it's paid.
- **Tracking events** arrive by webhook and move the order along.
- **Deadlines** (ship-by and complete-after) are columns, acted on by the scheduled job `/api/cron/tick`.
- **Assumed answers:**
  - **Q-3:** bank holidays pause the countdown, using the England and Wales list.
  - **Q-4:** the parcel size comes from the listing.
  - **Q-5:** "not received" opens 7 days after shipping (008).
  - **Q-6:** bottles over 150ml are blocked at listing time.
  - **Q-7:** decants are allowed until Royal Mail says otherwise.

## packages/core

| Function | File | Covers |
| --- | --- | --- |
| `UK_BANK_HOLIDAYS` (England and Wales, from gov.uk) and `addWorkingDays(date, n)` | new `dates.ts` | R-1 |
| `SHIP_BY_WORKING_DAYS = 5`, `COMPLETION_WINDOW_HOURS = 48`, `shipByFrom(paidAt)`, `completeAfterFrom(deliveredAt)` | new `orders.ts` | R-1, R-3 |
| The order state machine: `OrderStatus` (adds `cancelled`), `nextOrderStatus(status, event)` | `orders.ts` | R-5 |
| `parcelFor(listings)` (size class and weight estimate) and `royalMailPerfumeProblems(listings)` (≤150ml per item, ≤8 per parcel) | new `shipping.ts` | R-6, AC-1.2 |
| `validateListingInput` refuses sizes over 150ml with a reason (Q-6) | `listing-input.ts` | R-6 |

## Database

**Migration:** `NNNN_orders_shipping.sql`.
- **`order_status`:** add `cancelled`.
- **`orders`:** add `ship_by`, `shipped_at`, `delivered_at`, `complete_after`, `completed_at` and `cancelled_at`. None of these are in any grant.
- **Tracking:** revoke the old `carrier` / `tracking_number` update grant and the "seller adds tracking" policy. Tracking is now automatic.
- **`shipments`** `(id, order_id, service, provider, provider_ref, tracking_ref, label_ref, created_at)`: the order's buyer, seller and admins can read them. Swaps reuse this table later with `swap_side_id`.
- **`tracking_events`** `(id, shipment_id, at, status, description)`: same readers.
- **`sellers.dispatch_postcode`:** the owner can read and update it.
- **`transition_order(order_id, event)`:** security definer, called by the service client only. It applies `nextOrderStatus` logic in SQL, mirroring core, with a test that the two agree.

**RLS cases to test:**
- the buyer and seller see their shipments and events; others don't
- the apps can't change the status or deadlines
- the old tracking grant is gone

## Server

- **`lib/shipping/`:**
  - the `ShippingProvider` interface
  - `fake.ts`: fixed prices (Tracked 48 £3.35, Tracked 24 £4.25), a label PDF placeholder, and tracking moved on by hand
  - the real provider added once Q-1 is settled
- **On payment** (the 003 webhook): create the shipment and label, and set `ship_by`.
- **`/orders/[id]/label`:** a route that lets the seller only download the label.
- **`/api/webhooks/shipping`:** stores tracking events. The first scan moves the order to `shipped`. Delivered moves it to `delivered` and sets `complete_after`.
- **`/api/cron/tick`** (the order steps), checking `CRON_SECRET`:
  - Paid orders past `ship_by` are cancelled, refunded in full with `refundOrder`, and the listing stays sold (AC-2.3).
  - Delivered orders past `complete_after` with no open dispute are completed, and the seller is paid with `transferToSeller`.
- **Server actions:**
  - `confirmEverythingOk(orderId)`: the buyer only, while the order is delivered. It completes the order and pays the seller.
  - `setDispatchPostcode`.
- **Scheduling:** a `vercel.json` cron for `/api/cron/tick` every 15 minutes, or `pg_cron` on Hobby.
- **Admin, dev only (behind `SHIPPING_PROVIDER=fake`):** `/admin/shipments`, to step a shipment through its tracking events.

## packages/api

`listOrders(role)`, `getOrder(id)` (with its shipment and events), and `getQuote(listingId, postcode)` for 003's delivery step.

## Web

- **Header:** an Orders link.
- **`/orders`:** Buying and Selling tabs. Each order shows its status and the next action with a countdown.
- **`/orders/[id]`:**
  - the item, the price breakdown, the service, and `ship_to` (seller only)
  - a timeline of tracking events
  - seller: the label download and Royal Mail packing guidance (retail packaging, strong outer box, ID8000 on the label, a Post Office counter)
  - buyer: "Everything's OK" and "Report a problem", which links to 008 and stays disabled until 008 ships
  - cancelled and completed states
- **`/account`:** the dispatch postcode, needed before a seller's listings can be quoted.

## Risks and follow-ups

- **The real provider:** needs answers from Sendcloud or Royal Mail (research doc).
- **Cron frequency:** depends on the Vercel plan.
- **Parcel weights:** estimates from ml until a seller can weigh parcels.
