# 003: Checkout and payments — tasks

Built alongside 004. Needs Stripe test keys and the service-role key on this machine.

## Core
- [x] `checkoutBreakdown`: the seller receives the item price only. Update the tests (R-2)
- [x] `checkout.ts`: `canBuy`, `RESERVATION_MINUTES`, `reservationEndsAt`, `isUkPostcode`, `normalisePostcode`, plus tests (R-3, R-4, R-8, AC-2.1)

## Database
- [ ] `NNNN_checkout.sql`: addresses, reservations, `payouts_ready`, the new order columns and unique index, `webhook_events`, `reserve_listing`
- [ ] Run it on the dev database and check the RLS cases in plan.md

## Server and api
- [ ] `lib/supabase/service.ts` (server-only) and `lib/stripe.ts`
- [ ] `startCheckout` server action (AC-1.2 to AC-1.4)
- [ ] `/api/webhooks/stripe` with stored event ids: session completed (order, sold, label, refund of a duplicate), session expired, `account.updated` (AC-1.5, AC-2.2, AC-3.1)
- [ ] `startPayoutSetup`, plus the return and refresh routes (AC-3.1)
- [ ] `transferToSeller` and `refundOrder` helpers (AC-3.2)
- [ ] `getAddresses` and `getCheckoutSummary` in `packages/api`

## Web
- [ ] Buy now states on the listing page: sign in, payouts not ready, reserved (AC-1.1, AC-2.1)
- [ ] `/checkout/[listingId]`: address, delivery, summary, embedded Checkout (AC-1.2 to AC-1.4, AC-4.1)
- [ ] `/checkout/return`: the confirmation and failure states (AC-1.5, AC-1.6)
- [ ] The Payouts section on `/account` (AC-3.1)

## Check
- [ ] `npm test` and `npm run typecheck` pass
- [ ] In Stripe test mode, with `stripe listen`: a successful card payment, a declined card, two buyers at once, the seller's payout onboarding, and an order completed by 004 sending the transfer
