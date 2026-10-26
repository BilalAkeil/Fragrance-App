# 005: ID verification, reviews and seller profiles — tasks

## Part A: ID check (build second, after 001)

### Core
- [ ] `isAdult`, plus tests

### Database
- [ ] `NNNN_verification.sql`: `id_check_status` and the session id; listing and bottle inserts require a verified ID (R-1, R-2)
- [ ] Mark the existing test sellers verified with PR #3's toggle, and check the RLS cases in plan.md

### Server and web
- [ ] `lib/stripe.ts` and `lib/supabase/service.ts`, if 003 hasn't added them yet
- [ ] `startIdCheck`, and the Identity webhook events (AC-1.2, AC-1.3)
- [ ] `requireVerifiedSeller`, used to guard `/sell` and `/sell/bottles` (AC-1.1)
- [ ] `/account/verify` and its return page, with every state (AC-1)

## Part B: reviews and profiles (after 004)

### Core
- [ ] `certificationProgress`, `canReview` and `REVIEW_WINDOW_DAYS`, plus tests (R-3, R-5, AC-5.2)

### Database
- [ ] `NNNN_reviews.sql`: reviewer and reviewee, optional `swap_id`, completed-only insert within 30 days, `seller_ratings` by reviewee
- [ ] Check the RLS cases in plan.md

### Server and web
- [ ] `submitReview`, and the prompt on completed orders (AC-2)
- [ ] `getSellerProfile`, `listReviews`, and `/sellers/[id]` with its empty states (AC-4.1)
- [ ] Seller names link to profiles (AC-4.2)
- [ ] Certification status and next step on `/account` (AC-5)

## Check
- [ ] `npm test` and `npm run typecheck` pass
- [ ] In Identity test mode: verified, needs input and under-18 outcomes; an unverified seller is blocked from `/sell` and by the database; a review after completion appears on the profile and changes the badge at the threshold
