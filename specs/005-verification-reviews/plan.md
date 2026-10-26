# 005: ID verification, reviews and seller profiles — plan

How we'll build [spec.md](spec.md). Shared design: [docs/architecture.md](../../docs/architecture.md).

## Approach

**Built in two parts:**
- **Part A (before real sellers join):** the ID check and the gate in front of listing.
- **Part B (after 004):** reviews, public profiles and certification progress.

**Who can list:** the gate is enforced in the database (the insert policies), not just in the pages.

**Assumed answers:**
- **Q-1:** 5 reviews before the rating rule applies (the current placeholder).
- **Q-2:** swap reviews count.
- **Q-3:** a 30-day review window, and no seller replies.
- **Q-4:** buyers aren't reviewed.
- **Q-5:** Stripe Identity, with a document and a selfie.
- **Q-6:** 18+ only, checked from the date of birth Identity returns.

## packages/core

| Function | File | Covers |
| --- | --- | --- |
| `certificationProgress(seller)` returns the status plus the next step ("3 more reviews…", "Raise your average to 4★…") | `certification.ts` | AC-5.2 |
| `REVIEW_WINDOW_DAYS = 30`, `canReview({ status, completedAt, alreadyReviewed, now })` | new `reviews.ts` | R-5, AC-2.2 |
| `isAdult(dateOfBirth, now)` | `reviews.ts` (or `identity.ts`) | Q-6 |

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
- **The insert policy:** the reviewer is the order's buyer, the order is `completed` (not `delivered`), and it completed within 30 days. A refunded order after a dispute also qualifies (AC-2.3). 007 adds the swap rule.
- **`seller_ratings`** is rebuilt to group by `reviewee_id`, so swap reviews count.

**RLS cases to test:**
- an unverified seller's listing insert fails, and a verified seller's works
- reviewing a delivered (not completed) order fails, as does a second review
- the apps can't set `id_verified` or `id_check_status`

## Server

- **`startIdCheck()` (server action):** creates an Identity VerificationSession (document with a matching selfie, date of birth requested) with a return URL of `/account/verify/return`, and redirects to Stripe's hosted page.
- **Stripe webhook:**
  - `identity.verification_session.processing` sets `pending`
  - `verified` sets `id_verified` (if 18+) and `verified`
  - `requires_input` sets `needs_input`
  - under 18 sets `needs_input` with the reason "You must be 18 or over to sell"
- **`requireVerifiedSeller()`:** a server helper used by `/sell`, `/sell/bottles` and the 007 swap actions. It redirects to `/account/verify`.
- **`submitReview(orderId, rating, text)`:** a server action through the user's client.

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

- **Identity's cost** is per verification. Check the price before launch.
- **If 005 Q-5 picks the Connect ID check instead,** only `startIdCheck` and the webhook change.
