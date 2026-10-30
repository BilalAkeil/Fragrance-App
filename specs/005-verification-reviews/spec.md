# 005: ID verification, reviews and seller profiles

- **Status:** Draft
- **Design:** Bilal's canvas, frames Seller profile and Get certified (not yet checked against the canvas). Uses SellerBadge and SellerCard from the [design system](https://claude.ai/artifact/Stv4CqAUrz5UhFbBL6xVmd).
- **Depends on:** 001, 004 (reviews follow a completed order), 009 (admin review of receipts and the manual ID toggle, in Bilal's PR #3)

## Why

Trust is what we sell. Bilal's decisions put it like this. Everyone verifies their ID before they list or swap. "Certified" means ID checked, proof of purchase where possible, and an average of at least 4★. Today ID can only be set by an admin, by hand (PR #3), reviews can't be written from the site, and there's no public seller page. This spec covers all three.

## Scope

**In:**
- The ID check, using Stripe, before someone's first listing or swap.
- Reviews after a completed order or swap.
- A public seller profile.
- The certification badge, from the rules already in `packages/core/src/certification.ts`.
- Showing "Receipt verified" where an admin has approved proof of purchase.

**Out (and where it goes instead):**
- The admin screens for receipts, bottles and the manual ID toggle: 009.
- Disputes and removing reviews that break the rules: 008, 009.

## User stories

### US-1: As a new seller, I want to verify my ID once so that I can start listing

- **AC-1.1:** Given I haven't verified my ID, when I go to list or swap, then I'm taken to "Verify your ID". It explains why we ask, that it takes a few minutes, and that we don't keep copies of the document.
- **AC-1.2:** When I complete the Stripe check, then I come back to the site and see "Checking", then "Verified". Then I can list.
- **AC-1.3:** Given the check fails or needs more information, then I see what to do next and can try again.
- **AC-1.4:** Buying never needs an ID check.

### US-2: As a buyer, I want to review the seller after my order so that others can trust them

- **AC-2.1:** Given my order is completed, then I'm asked to rate the seller from 1 to 5 stars, with optional text.
- **AC-2.2:** I can leave one review per order, within 30 days of completion (Q-3).
- **AC-2.3:** Given an order was refunded after a dispute, then I can still review it.

### US-3: As a swapper, I want to review the other person after a swap

- **AC-3.1:** Given a swap is completed, then each side can review the other once (007).

### US-4: As a buyer, I want a seller's profile so that I can judge them

- **AC-4.1:** The profile shows:
  - the seller's name and certification badge
  - when they joined
  - their average rating and number of reviews
  - their active listings
  - their reviews, newest first
- **AC-4.2:** Seller names on listings and orders link to the profile.

### US-5: As a seller, I want to know where I stand on certification

- **AC-5.1:** My account shows my status: Not verified, ID verified (new seller), Certified seller, or Certification paused.
- **AC-5.2:** It also shows what's needed for the next step, for example "3 more reviews to become certified" or "Raise your average to 4★ to get your badge back".

## Rules

- **R-1:** `id_verified` is set only by server code, from Stripe's result or an admin's manual toggle (009). It's never set by the apps.
- **R-2:** Listing, registering a source bottle, and proposing or accepting a swap all need a verified ID.
- **R-3:** Certification comes from `certificationStatus()`:
  - unverified → Not verified
  - verified with fewer than the minimum reviews → ID verified, new seller
  - verified with enough reviews and an average of 4★ or more → Certified seller
  - verified with enough reviews and an average below 4★ → Certification paused

  The minimum is 5 for now, a placeholder (Q-1).
- **R-4:** Proof of purchase is encouraged and shown as "Receipt verified", but it never blocks the badge on its own (brief, Trust model).
- **R-5:** One review per completed order per buyer. In a swap, one review per side.

## Data

- **Sellers:** `id_verified` exists. Each seller's ID check also has a status (not started, pending, verified, needs input), the reason it needs input, and the Stripe reference. Only the seller and admins can see these, and only server code writes them.
- **Reviews:** keep one per order. Add an optional swap link, so a swap side can be reviewed, and record who wrote each review. Tighten today's rule ("delivered or completed") to completed orders only.
- **The rating view:** `seller_ratings` stays, and counts swap reviews too unless Q-2 decides otherwise.

## Screens and states

- **Verify your ID:** not started, in progress, verified, needs more information, failed.
- **Review prompt:** on the order page and in the completion email (010). Shows the form and a thank-you.
- **Public seller profile:** with no reviews yet, and with no active listings.
- **Account:** certification status and the next step.

## Open questions

- [ ] **Q-1:** How many reviews before the 4★ rule applies? 5 is a placeholder (brief Q-8).
- [ ] **Q-2:** Do swap reviews count towards a seller's rating and certification (brief Q-8)?
- [ ] **Q-3:** How long after completion can a review be left (30 days is assumed)? Can sellers reply to reviews?
- [ ] **Q-4:** Do sellers also review buyers, as on Vinted?
- [ ] **Q-5:** Should the ID check be Stripe Identity, or the ID part of Stripe's payout setup (003, Q-2)? One flow is simpler for sellers. The difference is that Identity also gives a selfie match.
- [ ] **Q-6:** Is there an age limit (18+) for selling or swapping?
