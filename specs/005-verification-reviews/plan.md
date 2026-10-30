# 005: ID verification, reviews and seller profiles — plan

How we'll build [spec.md](spec.md). Shared design: [docs/architecture.md](../../docs/architecture.md).

## Approach

**Built in two parts:**
- **Part A (before real sellers join):** the ID check and the gate in front of listing.
- **Part B (after 004):** reviews, public profiles and certification progress.

**Who can list:** the gate is enforced in the database (the insert policies), not just in the pages.

**Settled answers** (spec, Open questions; first built on assumed ones, then changed):
- **Q-1:** 5 reviews before the rating rule applies.
- **Q-2:** swap reviews count.
- **Q-3:** a 4-day review window, and the seller can reply once.
- **Q-4:** sellers review buyers too, but not in this PR: it needs member usernames first.
- **Q-5:** the ID check inside Stripe's payout setup (Connect onboarding).
- **Q-6:** 18+ only, checked from the date of birth Stripe verified during payout setup.

## packages/core

| Function | File | Covers |
| --- | --- | --- |
| `certificationProgress(seller)` returns the status plus the next step ("3 more reviews…", "Raise your average to 4★…") | `certification.ts` | AC-5.2 |
| `REVIEW_WINDOW_DAYS = 4`, `canReview({ status, endedAt, alreadyReviewed, now })`, `canReply` | new `reviews.ts` | R-5, AC-2.2, AC-2.4 |
| `isAdult(dateOfBirth, now)`, `idCheckStatus(payoutStatus, dob, now)`, `idCheckOutcome` | `identity.ts` | Q-5, Q-6, AC-1 |

## Database

**Part A migration:** `NNNN_verification.sql`.
- **`sellers`:** add `id_check_status` (`not_started`, `pending`, `verified`, `needs_input`) and `stripe_verification_session_id`. Neither is in any grant.
- **Who can list (R-2):**
  - the `listings` insert policy, and `source_bottles` insert, also require `exists (select 1 from sellers where id = auth.uid() and id_verified)`
  - existing test sellers need marking verified by an admin with PR #3's toggle

**Part B migration:** `NNNN_reviews.sql`.
- **`reviews`:**
  - `order_id` becomes nullable; add `swap_id` (a foreign key added in 007), `reviewer_id` and `reviewee_id`, with a check that exactly one of `order_id` or `swap_id` is set
  - unique on `order_id`, and on `(swap_id, reviewer_id)`
- **The insert policy:** the reviewer is the order's buyer, the order is `completed` (not `delivered`), and it completed within 30 days (4 days after `0017`, Q-3). A refunded order after a dispute also qualifies (AC-2.3). 007 adds the swap rule.
- **`seller_ratings`** is rebuilt to group by `reviewee_id`, so swap reviews count.

**RLS cases to test:**
- an unverified seller's listing insert fails, and a verified seller's works
- reviewing a delivered (not completed) order fails, as does a second review
- the apps can't set `id_verified` or `id_check_status`

## Server

- **The ID check is payout setup (Q-5):** "Verify your ID" starts 003's `startPayoutSetup`. `syncSellerAccount` (the account webhooks and the onboarding return) reads the account with its identity. Once payouts are ready and the date of birth is 18 or over, it sets `id_verified` and the check to `verified`. Under 18 sets `needs_input` with the reason `under_age`. The return sends anyone not yet verified back to `/account/verify`.
- **`requireVerifiedSeller()`:** a server helper used by `/sell`, `/sell/bottles` and the 007 swap actions. It redirects to `/account/verify`.
- **`submitReview(orderId, rating, text)` and `replyToReview(orderId, reviewId, reply)`:** server actions through the user's client.

## packages/api

`getSellerProfile(id)` (the seller, rating, certification, active listings and reviews) and `listReviews(sellerId, page)`.

## Web

- **`/account/verify`:** why we ask, then Start, then the states: in progress, verified, needs more information (with Try again), failed. **`/account/verify/return`** shows "Checking…" until the webhook lands.
- **The gate:** `/sell` and `/sell/bottles` redirect unverified sellers.
- **`/sellers/[id]`:** a public profile showing the badge, join date, rating, active listings (the ListingCard grid) and reviews, plus the empty states.
- **Links:** seller names link to the profile from ListingCard, SellerCard and orders.
- **On `/orders/[id]` once completed:** a review prompt (1 to 5 stars and text), then a thank-you.
- **`/account`:** the certification status and next step.

## Risks and follow-ups

- **Connect's ID check has no selfie match,** unlike Stripe Identity. If fakes or stolen identities become a problem, Identity can be added for higher-risk sellers.

## Changes while building

- **The ID check's status lives in a new `id_checks` table** (`0015`), not on `sellers`. Everyone can read `sellers`, and the check's state and reason are only for the seller and admins. It has no write policies or grants: only server code writes it. Its `stripe_verification_session_id` column is unused since Q-5 moved the check into payout setup.
- **Q-1 to Q-6 were settled mid-build** ("copy Vinted, comply with UK law"). Stripe Identity was built first, then replaced by the check in payout setup. That also removed the need for a restricted Stripe key to read the date of birth, because Connect returns it with the secret key. `0017` changes the review window from 30 days to 4, and adds seller replies.
- **UK law on reviews (R-6):** a `/reviews-policy` page, linked from the review form and every profile.
- **Under 18 shows as "We can't verify your ID"** with no way to try again. The status in the database is still `needs_input`, with the reason `under_age`.
- **`reviews.seller_id` is renamed `reviewee_id`** rather than adding a second column. `reviewer_id` defaults to the signed-in user and isn't in the insert grant. `seller_ratings` keeps its columns and now runs as the reader (`security_invoker`), which also clears the security advisor's error.
- **`orders.refunded_at`** (`0016`) is set by `transition_order`, so a review after a refund (AC-2.3) has a window to count from.
- **Reviews don't show who wrote them,** only "Verified purchase" or "After a swap". Buyers have no public name yet. Vinted shows usernames, so this comes with Q-4's follow-up.
- **Replies are written from the seller's order page,** and shown there and on the profile.
- **`ListingCard`** is now its own component, with the seller's name outside the card's link so it can link to their profile.
- **The orders list** still shows the seller's name as plain text, because each row is already a link to the order. The order page links to the seller.
