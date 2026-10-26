# 003: Checkout and payments — plan

How we'll build [spec.md](spec.md). Shared design: [docs/architecture.md](../../docs/architecture.md). Built together with [004](../004-orders-shipping/plan.md), which supplies the delivery quotes, labels and the completion step that triggers the payout.

## Approach

- **Our checkout page** collects the address and the delivery service (with 004's quote). It reserves the listing, then mounts an **embedded Stripe Checkout Session** with three lines: item, postage and Buyer Protection.
- **The Stripe webhook** creates the order with the service client and marks the listing sold.
- **The money stays on the platform** (separate charges and transfers) until 004 completes the order. Then a Transfer sends the item price to the seller's Connect Express account.
- **Assumed answers:**
  - **Q-2:** sellers set up payouts before their listings can be bought; listing doesn't require it.
  - **Q-3:** a reservation lasts 30 minutes, because a Stripe Checkout Session can't expire sooner than that.
  - **Q-4:** Apple Pay and Google Pay are on, since Checkout offers them with no extra work.
  - Buyer Protection is 3% + 30p, from PR #8.

## packages/core

| Change | File | Covers |
| --- | --- | --- |
| `checkoutBreakdown`: `sellerReceivesPence` = item price only; postage pays the label | `fees.ts` | R-1, R-2 |
| `canBuy({ listing, buyerId, sellerPayoutsReady, reservation, now })` returns the reasons it can't | new `checkout.ts` | R-3, R-4, AC-2.1, AC-3.1 |
| `RESERVATION_MINUTES = 30`, `reservationEndsAt(now)` | `checkout.ts` | AC-2.1 |
| `isUkPostcode(text)`, `normalisePostcode(text)` | `checkout.ts` | R-8 |

## Database

**Migration:** `NNNN_checkout.sql`.
- **`addresses`** `(id, user_id, name, line1, line2, town, postcode, created_at)`: owners can read and write their own rows.
- **`listings`:** add `reserved_by` and `reserved_until`. Neither is in any grant.
- **`sellers`:** add `payouts_ready boolean default false`. Not in any grant (`stripe_account_id` already exists).
- **`orders`:**
  - add `delivery_service`, `ship_to jsonb` (a snapshot of the address), `stripe_checkout_session_id`, `stripe_payment_intent_id` (exists), `stripe_charge_id`, `stripe_transfer_id`, `paid_at`
  - a unique index on `listing_id` where status isn't `cancelled` or `refunded` (AC-2.2)
- **`webhook_events`** `(id text primary key, type, received_at)`: no grants, service only.
- **`reserve_listing(listing_id)`:** security definer. It sets the reservation only if the listing is active, the buyer isn't the seller, and no other reservation is still live. It returns true or false.

**RLS cases to test:**
- a buyer sees only their own addresses
- `reserve_listing` refuses the seller's own listing and one that's already reserved
- apps can't write reservations, `payouts_ready` or orders
- the seller can read `ship_to` on their own order

## Server

- **`lib/stripe.ts`:** a server-only Stripe client.
- **`startCheckout` (server action):**
  1. checks `canBuy`
  2. calls `reserve_listing`
  3. gets the quote for the chosen service (004)
  4. creates an embedded Checkout Session with `expires_at` set to the reservation's end, the metadata (listing, buyer, service, quote, address id) and `payment_intent_data.transfer_group = listing id`
  5. returns the client secret
- **`/api/webhooks/stripe`:**
  - `checkout.session.completed`: insert the order (status `paid`, `ship_by` from 004), mark the listing sold, clear the reservation, close open swap proposals (a hook for 007), ask 004 for the label, and notify (a hook for 010). If the unique index fails, refund the payment straight away and notify the buyer (AC-2.2).
  - `checkout.session.expired`: clear the reservation.
  - `account.updated`: set `payouts_ready` = `details_submitted && payouts_enabled`.
- **Payouts:**
  - `startPayoutSetup()` creates the Express account (GB) if there isn't one and returns an Account Link.
  - `/account/payouts/return` and `/refresh` routes.
- **Helpers for 004 and 008:**
  - `transferToSeller(order)`: a Transfer of `item_pence` with `source_transaction` set to the order's charge
  - `refundOrder(order, amountPence?)`

## packages/api

- `getAddresses()` and `getCheckoutSummary(listingId)` (listing, seller, payouts ready).
- In sample mode, checkout shows a notice that payments need Stripe keys.

## Web

- **Listing page:** Buy now goes to `/checkout/[listingId]`. When the seller hasn't set up payouts, it says "This seller is still setting up payouts". When someone else has it reserved, it says "Someone is checking out this item".
- **`/checkout/[listingId]`:**
  1. address (saved or new)
  2. delivery (Tracked 24 / 48 with prices from 004)
  3. the summary using `PriceBreakdown`, plus the Buyer Protection explanation (AC-4.1)
  4. embedded Stripe Checkout
- **`/checkout/return`:** reads the session, then shows the confirmation ("The seller has 5 working days to send it", and a link to the order) or the failure.
- **`/account`:** a Payouts section showing not started, in progress, needs information, or ready.

## Risks and follow-ups

- **Test the webhook ordering.** The buyer can land on `/checkout/return` before the webhook arrives, so the confirmation page waits briefly for the order.
- **VAT on the fee (Q-5) needs an accountant.** No code depends on it yet.
