# 002: Fragrance catalogue — plan

How we'll build [spec.md](spec.md). Shared design: [docs/architecture.md](../../docs/architecture.md).

## Approach

- **Three public tables:** houses, fragrances and sizes, each size with a guide price. Admins write them; everyone can read them.
- **Linking listings:** listings and source bottles get an optional link to a fragrance. When a seller picks from the catalogue, the canonical house and name are copied onto the listing, so today's full-text search keeps working without changes.
- **Unmatched listings** are simply listings with no fragrance link, so there's no separate requests table.
- **Assumed answers:**
  - **Q-1:** the catalogue starts from a CSV that we prepare, imported by a script, and grows through the admin screens.
  - **Q-2:** guide prices are set by admins.
  - **Q-3:** flankers are separate fragrances; reformulations aren't.
  - **Q-4:** notes stay as the seller writes them.

## packages/core

| Function | File | Covers |
| --- | --- | --- |
| `Concentration` type (`edc`, `edt`, `edp`, `parfum`, `extrait`, `other`) and labels | new `catalogue.ts` | AC-1.2 |
| `guidePricePerMl(sizes)`: the most common size's price ÷ its ml. Ties go to the larger size | `catalogue.ts` | R-4 |
| `guideValuePence(listing, sizes)`: full = that size's price; partial = price × fill%; decant = per-ml × ml; otherwise `undefined` | `catalogue.ts` | AC-4, R-3, R-4 |
| `normaliseName(text)` for matching and aliases: lowercase, no accents, no punctuation | `catalogue.ts` | AC-1.1, AC-2.1 |

## Database

**Migration:** `NNNN_catalogue.sql`.
- `create extension if not exists pg_trgm`.
- **The tables:**
  - `houses (id, name unique, aliases text[])`
  - `fragrances (id, house_id, name, concentration, launch_year, aliases text[])`, unique on `(house_id, lower(name), concentration)`
  - `fragrance_sizes (id, fragrance_id, size_ml, guide_price_pence check > 0, updated_by, updated_at)`, unique on `(fragrance_id, size_ml)`
  - `guide_price_changes (size_id, old_pence, new_pence, changed_by, changed_at)`, filled by a trigger (AC-3.4)
- `listings.fragrance_id` and `source_bottles.fragrance_id`: optional foreign keys, added to the insert and update grants.
- Trigram indexes on house and fragrance names and their aliases, for the typeahead.
- **RLS:** everyone can select from all four tables. Insert, update and delete are allowed only when `is_admin()`.
- **`admin_merge_fragrance(from_id, to_id)`:** security definer, admins only. It moves listings and bottles to the kept fragrance, adds the old name as an alias, and deletes the old entry (AC-3.3).

**RLS cases to test:** anyone can read; a seller can't write; an admin can write and merge; a listing can be linked to any fragrance.

## Server

- **`/api/catalogue/search?q=&house=`:** a route handler returning up to 10 houses or fragrances for the typeahead. It uses the anon client (the catalogue is public) and the trigram indexes.
- **Admin server actions** in `app/admin/catalogue/actions.ts`: add or edit a house, fragrance or size; set a guide price; match an unmatched listing (sets `fragrance_id` and the canonical names, through the service client after checking `is_admin()`); merge.
- **`scripts/import-catalogue.ts`:** reads a CSV (house, name, concentration, year, size_ml, guide_price) and upserts it through the service client. It's run by hand.

## packages/api

- `searchCatalogue(q)`, `getFragranceSizes(fragranceId)`, and `getGuideValue(listing)` (which uses core's `guideValuePence`, for 007).
- Sample catalogue data for the fragrances in the sample listings, so the typeahead works with no database.

## Web

- **ListingForm and BottleForm:**
  - a house picker, then a fragrance picker, with suggestions (a client component calling the search route)
  - "Can't find it? Type it in" switches to free text, with a "Not yet matched" notice
- **Browse:** a house filter (`&house=`) that matches listings through `fragrance_id → house_id`.
- **Admin, under `/admin/catalogue`:**
  - a list with search
  - a fragrance page (sizes, guide prices and their change history)
  - an "Unmatched" queue of listings with no fragrance, offering "Match to…" or "Add new"
  - merge

## Risks and follow-ups

- The size of the starting catalogue depends on Q-1. Without at least a few hundred common fragrances, most listings will start out unmatched. Budget admin time.
- A guide price goes stale without upkeep. The swap screens show when each price was last updated.

## Changes while building

- **Admin writes don't use a service client.** As in PR #3's admin screens, they go through the admin's own client: RLS lets only admins change the catalogue, and matching and merging are security-definer functions that check `is_admin()`. So the web app still has no service-role key before 003.
- **The database copies the catalogue's spelling** onto a matched listing or bottle (a trigger), whatever the seller's browser sends (AC-1.3). The name includes the concentration, for example "Sauvage Eau de Parfum" (`fragranceDisplayName` in core), so EDT and EDP stay distinct wherever the name shows.
- **"Most common size" (R-4)** means the size with the most listings of that fragrance (full bottles and partials, not removed). Ties, including no listings at all, go to the larger size.
- **A full bottle or partial of a size the catalogue doesn't have** gets no guide value, the same as an unpriced one (AC-4.4).
- **Bottles join the unmatched queue** alongside listings, with `admin_match_bottle` (`0009`).
- **Migrations:** `0006_catalogue`, then two fixes after it ran on dev: `0007` moves `pg_trgm` out of `public` (security advisor), and `0008` rewrites the accent list as ASCII escapes after it reached dev garbled.
- **The brand filter only shows listings matched to the catalogue.** A typed-in listing appears under its brand once an admin matches it. See the open question in the PR.
