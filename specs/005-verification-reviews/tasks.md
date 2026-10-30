# 005: ID verification, reviews and seller profiles — tasks

## Part A: ID check (build second, after 001)

### Core
- [x] `isAdult`, plus tests (and `idCheckStatus` and `idCheckOutcome` in `identity.ts`)

### Database
- [x] `0015_verification.sql`: `id_check_status` and the session id (in a private `id_checks` table, see plan); listing and bottle inserts require a verified ID (R-1, R-2)
- [x] Mark the existing test sellers verified with PR #3's toggle (BilalTestShop; Ben test shop was verified through Stripe instead), and check the RLS cases in plan.md

### Server and web
- [x] `lib/stripe.ts` and `lib/supabase/service.ts`, if 003 hasn't added them yet (003 had)
- [x] The ID check: first Stripe Identity, then (Q-5 settled) payout setup through `syncSellerAccount` (AC-1.2, AC-1.3)
- [x] `requireVerifiedSeller`, used to guard `/sell` and `/sell/bottles` (AC-1.1)
- [x] `/account/verify`, with every state (AC-1)

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

## Settled questions (2026-10-30)
- [x] Spec and plan updated with the answers (copy Vinted, comply with UK law)
- [x] `0017_review_decisions.sql`: 4-day window, one reply by the reviewee, plus its RLS cases
- [x] `replyToReview`, and replies on the order page and the profile (AC-2.4)
- [x] `/reviews-policy` (AC-2.5, R-6)
- [ ] Sellers review buyers (Q-4): needs member usernames first. Left for a follow-up

## Check
- [x] `npm test` and `npm run typecheck` pass
- [x] In Stripe test mode: verified, needs input and under-18 outcomes; an unverified seller is blocked from `/sell` and by the database; a review after completion appears on the profile and changes the badge at the threshold. Under 18 is covered by tests only, because Stripe's test onboarding uses an adult's date of birth. The badge change is checked in core's tests and against the rating view, since dev has only two completed orders
