# 001: Baseline — tasks

Work top to bottom. Tick each task as it lands. Before starting: PR #3 is merged and `main` is pulled.

## Core
- [x] Make `batchCode` optional, and add `ListingStatus` and `status` to `Listing` (R-6, AC-8.2)
- [x] `validateListingInput`: drop the batch-code and source-bottle errors, and add `photoCount` (R-1 to R-5, R-7). Update the tests
- [x] `validateDecantListing`: no bottle means only the 5ml rule; a linked bottle must be the seller's own and have room left (R-7 to R-9). Update the tests
- [x] `hasVerifiedSource`, `batchCodeLabel`, `canEditListing`, plus tests (R-6, R-10, R-11)
- [x] `decantLabel` without a batch code, plus a test
- [x] `filters.ts`: `ListingFilter` and `matchesFilter`, plus tests (AC-7.3)

## Database
- [x] `0005_baseline.sql`: nullable batch codes, `decant_min_size`, the capacity trigger skips unlinked decants, sold listings are public, sellers can't set `sold`, `updated_at`
- [x] Run it on the dev database and check the RLS cases in plan.md

## Server and api
- [x] Row types and mappers: nullable batch code, and `status`
- [x] `listListings` filters (kind, condition, price, certified only, query), and the sample marketplace uses `matchesFilter`
- [x] Sample data: a listing with no batch code and an unlinked decant
- [x] `removeListing` server action

## Web
- [x] Turn `SellForm` into `ListingForm`: optional batch code, an optional source-bottle link with statuses, used for create and edit (AC-3, AC-4)
- [x] `/listings/[id]/edit`: owner only, active only; photos add, remove and reorder (AC-6.1)
- [x] Listing page: "No batch code", "Verified source" only when verified, sold and removed states, owner Edit and Remove (AC-4.2 to AC-4.4, AC-6.2, AC-8)
- [x] Browse filter row driven by the URL, plus an empty state with "Clear filters" (AC-7)
- [x] `/sell/bottles`: optional batch code and the video instructions (AC-5.1, AC-5.2)
- [x] `/account`: listings by status with Edit and Remove; bottle statuses from `review_decisions`; design-system styling (AC-5.4, AC-6)

## Check
- [x] `npm test` and `npm run typecheck` pass
- [ ] Every acceptance criterion is covered by a test or checked by hand in `npm run dev:web`, with sample data and with the dev database
