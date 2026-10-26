# 003: Checkout and payments

- **Status:** Draft
- **Design:** Bilal's canvas, Checkout frame (not yet checked against the canvas). Uses PriceBreakdown from the [design system](https://claude.ai/artifact/Stv4CqAUrz5UhFbBL6xVmd).
- **Depends on:** 001, 004 (live delivery quotes and labels), 005 (seller ID before listing)

## Why

Buyers can't buy anything yet: the Buy button says "checkout coming soon". This spec covers paying for a listing the Vinted way. The buyer pays the item price, postage for the delivery service they choose, and a Buyer Protection fee. We hold the money until the order completes, then pay the seller. Sellers pay nothing.

## Scope

**In:**
- Buying one listing: address, choosing a delivery service at its live price, and paying by card.
- Holding the payment, and paying the seller when the order completes (completion is defined in 004).
- Sellers setting up payouts.
- Stopping two people from buying the same item.
- The order confirmation page.

**Out (and where it goes instead):**
- Delivery quotes, labels and tracking: 004.
- Refunds after a problem is reported: 008. Automatic refunds when an order isn't shipped: 004.
- Paying for swaps (Swap Protection fee, holds, cash top-ups): 007.
- Price offers: 011.
- Buying several items in one checkout: later.

## User stories

### US-1: As a buyer, I want to pay for a listing so that it's mine

- **AC-1.1:** Given I'm not signed in, when I choose Buy now, then I'm asked to sign in and brought back to the same listing.
- **AC-1.2:** When I start checkout, then I enter (or choose a saved) UK delivery address.
- **AC-1.3:** Given my address, then I see the delivery services for this parcel with their live prices (from 004), and I pick one.
- **AC-1.4:** Before paying, I see the item price, postage, Buyer Protection and the total, worked out by `packages/core`.
- **AC-1.5:** When I pay by card and it succeeds, then I see an order confirmation with what happens next ("The seller has 5 working days to send it"). The listing shows as sold.
- **AC-1.6:** Given the payment fails, then nothing is bought, the listing stays available, and I'm told why in plain words.

### US-2: As a buyer, I don't want to pay for something someone else has just bought

- **AC-2.1:** Given another buyer is in checkout for the same listing, then the listing is reserved for them for a short time (see Q-3). I see "Someone is checking out this item" and can't start checkout.
- **AC-2.2:** Given two payments succeed for the same listing anyway, then the second is refunded in full automatically, and that buyer is told.

### US-3: As a seller, I want to be paid when the order completes

- **AC-3.1:** Before my listings can be bought, I set up payouts: bank details and the checks Stripe needs.
- **AC-3.2:** When my order completes (004), then the item price is paid to my payouts account. I see the amount and the expected arrival date.
- **AC-3.3:** I never pay a fee, and I'm never paid the postage. Postage pays for the label.

### US-4: As a buyer, I want to understand Buyer Protection before I pay

- **AC-4.1:** At checkout, Buyer Protection has a short explanation: my money is held until I confirm the item is OK, and I'm refunded if it doesn't arrive, isn't as described, or isn't genuine.

## Rules

- **R-1:** Buyer total = item price + chosen postage + Buyer Protection fee. All of these are integer pence, and the fee comes from `buyerProtectionFee()`.
- **R-2:** The seller receives the item price only. Today `checkoutBreakdown` adds postage to what the seller receives, so it must change.
- **R-3:** A buyer can't buy their own listing.
- **R-4:** Only active listings can be bought.
- **R-5:** An order is created only by server code after the payment succeeds, never by the apps.
- **R-6:** When an order is created:
  - the listing becomes sold
  - every open swap proposal that includes it closes (007)
  - a checkout reservation lasts for a short, fixed time (Q-3)
- **R-7:** The money is held until the order completes, is cancelled, or a dispute is decided. The seller is paid only on completion.
- **R-8:** Only UK delivery addresses are accepted.

## Data

- **Orders** (existing table): the chosen delivery service, the postage quote it was bought at, and the delivery address. Address fields can be read only by the buyer, the seller (once paid, so they can send it) and admins.
- **Saved addresses:** each buyer's own, readable only by them.
- **Seller payouts:** the Stripe account and whether payouts are ready (`sellers.stripe_account_id` exists). Only server code sets it.
- **A reservation on a listing:** who reserved it and until when.

## Screens and states

- **Listing page:** Buy now. If the seller hasn't set up payouts, the item isn't buyable and says so.
- **Checkout:**
  - address
  - delivery choices with prices (loading, and "no services available for this address")
  - summary
  - pay (in progress, failed, and "reserved by someone else")
- **Order confirmation.**
- **Account:** set up payouts (not started, in progress, needs more information, ready).

## Open questions

- [x] **Q-1:** What's the final Buyer Protection fee? **3% of the item price + 30p** (Bilal, 2026-10-26, PR #8).
- [ ] **Q-2:** Do sellers set up payouts before their first listing, or before their first sale? Stripe's payout setup also checks ID, so it could double as the ID check in 005. Should it?
- [ ] **Q-3:** How long does a checkout reservation hold a listing (for example 10 minutes)?
- [ ] **Q-4:** Do we offer Apple Pay and Google Pay at launch, or cards only?
- [ ] **Q-5:** Is the Buyer Protection fee subject to VAT? This is a question for an accountant before launch.
