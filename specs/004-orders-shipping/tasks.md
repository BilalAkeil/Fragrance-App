# 004: Orders and shipping — tasks

Built alongside 003. Uses the `fake` shipping provider until the broker is chosen.

## Core
- [x] `dates.ts`: the England and Wales bank holidays and `addWorkingDays`, plus tests across weekends and holidays (R-1)
- [x] `orders.ts`: constants, `shipByFrom`, `completeAfterFrom`, the order state machine, plus tests (R-1, R-3, R-5)
- [x] `shipping.ts`: `parcelFor` and `royalMailPerfumeProblems`; listing input refuses over 150ml. Tests (R-6, AC-1.2)

## Database
- [x] `0010_orders_shipping.sql` (and `0013_order_access.sql` after the advisor): `cancelled` status, deadline columns, drop the manual tracking grant, shipments, tracking events, dispatch postcode, `transition_order`
- [x] Run it on the dev database and check the RLS cases in plan.md

## Server and api
- [x] `lib/shipping/` interface and `fake` provider
- [x] Shipment and label on payment, plus the label download route (AC-2.1)
- [x] `/api/webhooks/shipping`: shipped and delivered (AC-3)
- [x] `/api/cron/tick`: cancel unshipped orders (refund) and complete delivered ones (payout) (R-2, R-4, AC-2.3, AC-4.3)
- [ ] The cron config: waits on the Vercel plan (Hobby only runs daily), or `pg_cron`
- [x] `confirmEverythingOk` and `setDispatchPostcode` server actions (AC-4.1)
- [x] `listOrders`, `getOrder` and `getQuote` in `packages/api`
- [x] The notifications table and `notify()` from the 010 plan, raising the order events
- [x] Dev-only `/admin/shipments` to step tracking

## Web
- [x] Orders link in the header, and `/orders` with Buying and Selling tabs (AC-5.1)
- [x] `/orders/[id]`: timeline, label and packing guidance, countdowns, buyer actions, every status (AC-2, AC-3.3, AC-4, AC-5.2)
- [x] Dispatch postcode on `/account`

## Check
- [x] `npm test` and `npm run typecheck` pass
- [x] End to end with Stripe test mode and the `fake` provider: buy → label → shipped → delivered → Everything's OK → transfer. Also: not shipped → cancelled and refunded, and delivered → 48 hours → auto-complete
