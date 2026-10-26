# 001: Baseline — plan

How we'll build [spec.md](spec.md). Shared design: [docs/architecture.md](../../docs/architecture.md).

## Approach

- **Relax two rules everywhere they live:** batch codes become optional, and decants no longer have to link to a source bottle. That's `packages/core`, the database constraint and trigger, and the forms.
- **Add what's missing:** editing and removing listings, sold and removed states on the listing page, and filters on browse driven by the URL.
- **Assumed answers to the spec's open questions** (easy to change):
  - **Q-1:** a decant can link to an unchecked bottle. The badge appears once the bottle is approved.
  - **Q-2:** badges aren't filters.
  - **Q-3:** no drafts. Listings go live when saved; the `draft` status stays unused.
- **Merge PR #3 first.** It changes the same tables and the account page, and it uses migrations 0003 and 0004.

## packages/core

| Change | File | Covers |
| --- | --- | --- |
| `batchCode` becomes optional on `Listing`, `SourceBottle` and `ListingInput` | `types.ts`, `listing-input.ts` | R-6 |
| Add `ListingStatus` (`draft`, `active`, `sold`, `removed`) and `status` on `Listing` | `types.ts` | AC-6, AC-8.2 |
| `validateListingInput` drops the batch-code and source-bottle errors, and takes `photoCount` (at least 1) | `listing-input.ts` | R-1 to R-5, R-7 |
| `validateDecantListing(listing, bottle?, usedMl)`: with no bottle, only the 5ml rule applies; with a bottle, it must be the seller's own and have room left. No check of `verifiedAt` | `decants.ts` | R-7 to R-9 |
| `hasVerifiedSource(listing, bottle?)` | `decants.ts` | R-10 |
| `batchCodeLabel(batchCode?)` returns "Batch 3J01" or "No batch code" | `listing-input.ts` | R-6 |
| `decantLabel` leaves out the batch code when there isn't one | `decants.ts` | Brief, decant labels |
| `canEditListing(status, isOwner)` | `listing-input.ts` | R-11 |
| `ListingFilter` type and `matchesFilter(listing, seller, filter)` (kind, condition, price range, certified only, query) for sample data | new `filters.ts` | AC-7.3 |

The existing tests are updated to the new rules, and new tests cover each row above.

## Database

**Migration:** `NNNN_baseline.sql`, the next free number after PR #3.
- `listings.batch_code` and `source_bottles.batch_code` become nullable.
- The `decant_rules` constraint is replaced by `decant_min_size` (`kind <> 'decant' or size_ml >= 5`).
- `check_decant_capacity()` returns early when `source_bottle_id` is null. The capacity check is otherwise unchanged.
- **Who can see what:** the select policy "active listings are public" becomes "active and sold listings are public" (`status in ('active','sold') or seller_id = auth.uid()`). It also keeps PR #3's admin policy.
- **Fix:** a seller can currently mark their own listing `sold`, because `status` is in their update grant. The update policy gets `with check (status in ('active','removed'))` and the insert policy `with check (status = 'active')`, so only server code can set `sold`.
- `listings.updated_at`, with a trigger that sets it on update.

**RLS cases to test:**
- anyone can see an active or sold listing, but not a removed one
- an owner can see and edit their own active listing, but can't edit a sold one
- an owner can't set `sold`
- someone else can't edit it
- a decant with no bottle saves
- an over-capacity decant on a linked bottle fails

## Server

- **Server action `removeListing(id)`** in `app/listings/[id]/actions.ts` sets the status to `removed`, through the user's client.
- **Editing** uses the user's client, like listing does today. The photos policy already lets an owner manage photos on their own listings.

## packages/api

- In `rows.ts`, `batch_code` becomes `string | null`, `status` is added, and the mappers handle both.
- `listListings(filter)` takes `kind`, `condition`, `minPence`, `maxPence`, `certifiedOnly` and `query`.
  - The database filters on kind, condition and price.
  - `certifiedOnly` is applied afterwards with `certificationStatus()` from core, so the rule stays in core. Results are capped at 60 for now.
- `getListing` returns the status, so the page can show sold and removed.
- The sample marketplace uses `matchesFilter()`. Sample data gains a listing with no batch code and an unlinked decant.

## Web

- **`ListingForm`:** `app/sell/SellForm.tsx` becomes a shared form used by `/sell` and a new `/listings/[id]/edit`.
  - When editing, the kind is fixed.
  - The batch code is marked optional.
  - For decants there's an optional "Link a source bottle" select. It shows "None", then the seller's bottles with their status, plus a "Register a bottle" link.
  - Photos: add, remove and reorder when editing.
- **`/listings/[id]`:**
  - a "No batch code" tag
  - the "Verified source" tag and source box only for verified links
  - sold and removed states with no Buy button
  - Edit and Remove for the owner
- **`/listings/[id]/edit`:** owner only, and only for active listings. Anyone else is redirected to the listing.
- **Home and browse:**
  - The filter row (kind pills, condition, min/max price, certified only) writes to the URL (`/?q=&kind=&condition=&min=&max=&certified=1`).
  - `ListingBrowser` reads the results from the server instead of filtering in the browser.
  - When nothing matches, there's a "Clear filters" link.
- **`/sell/bottles`:**
  - batch code optional
  - the video instructions from AC-5.2
- **`/account`:**
  - listings grouped as Active, Sold and Removed, with Edit and Remove
  - bottles with their status from PR #3's `review_decisions`
  - styled with the design-system tokens

## Risks and follow-ups

- The certified-only filter works on at most 60 results, which is fine for launch. Move certification into a database view if it needs to scale (it duplicates the rule, so it needs its own test).
- If 001 Q-1 changes to "checked bottles only", that's a one-line change to the bottle select and a check in `validateDecantListing`.
