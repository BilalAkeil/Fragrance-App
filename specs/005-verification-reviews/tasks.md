# 005: ID verification, reviews and seller profiles — tasks

## Part A: ID check (build second, after 001)

### Core
- [x] `isAdult`, plus tests (and `idCheckOutcome`, the screen for each Stripe outcome, in `identity.ts`)

### Database
- [x] `0015_verification.sql`: `id_check_status` and the session id (in a private `id_checks` table, see plan); listing and bottle inserts require a verified ID (R-1, R-2)
- [x] Mark the existing test sellers verified with PR #3's toggle (BilalTestShop; Ben test shop goes through Identity instead), and check the RLS cases in plan.md

### Server and web
- [x] `lib/stripe.ts` and `lib/supabase/service.ts`, if 003 hasn't added them yet (003 had)
- [x] `startIdCheck`, and the Identity webhook events (AC-1.2, AC-1.3)
- [x] `requireVerifiedSeller`, used to guard `/sell` and `/sell/bottles` (AC-1.1)
- [x] `/account/verify` and its return page, with every state (AC-1)

## Part B: reviews and profiles (after 004)

### Core
- [x] `certificationProgress`, `canReview` and `REVIEW_WINDOW_DAYS`, plus tests (R-3, R-5, AC-5.2)

### Database
- [x] `0016_reviews.sql`: reviewer and reviewee, optional `swap_id`, completed-only insert within 30 days, `seller_ratings` by reviewee
- [x] Check the RLS cases in plan.md

### Server and web
- [x] `submitReview`, and the prompt on completed orders (AC-2)
- [x] `getSellerProfile`, `listReviews`, and `/sellers/[id]` with its empty states (AC-4.1)
- [x] Seller names link to profiles (AC-4.2)
- [x] Certification status and next step on `/account` (AC-5)

## Check
- [x] `npm test` and `npm run typecheck` pass
- [x] In Identity test mode: verified, needs input and under-18 outcomes; an unverified seller is blocked from `/sell` and by the database; a review after completion appears on the profile and changes the badge at the threshold. Under 18 is covered by tests only: Stripe's test outcomes always give an adult's date of birth, and reading it needs `STRIPE_IDENTITY_RESULTS_KEY`. The badge change is checked in core's tests and against the rating view, since dev has only two completed orders
