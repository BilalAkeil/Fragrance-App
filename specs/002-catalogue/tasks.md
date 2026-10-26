# 002: Fragrance catalogue — tasks

## Core
- [ ] `catalogue.ts`: `Concentration`, `normaliseName`, `guidePricePerMl`, `guideValuePence`, plus tests for full, partial, decant and no-price cases (R-3, R-4, AC-4)

## Database
- [ ] `NNNN_catalogue.sql`: pg_trgm; houses, fragrances, sizes, price-change history and its trigger; `fragrance_id` on listings and bottles; RLS; `admin_merge_fragrance`
- [ ] Run it on the dev database and check the RLS cases in plan.md

## Server and api
- [ ] `/api/catalogue/search` route
- [ ] `searchCatalogue`, `getFragranceSizes` and `getGuideValue` in `packages/api`, with sample catalogue data
- [ ] `scripts/import-catalogue.ts`, and a starter CSV with the sample fragrances
- [ ] Admin actions: add and edit, set guide price, match an unmatched listing, merge (AC-3)

## Web
- [ ] House and fragrance pickers with the free-text fallback in ListingForm and BottleForm (AC-1)
- [ ] House filter on browse (AC-2.2)
- [ ] `/admin/catalogue` list, the fragrance page with sizes and price history, the Unmatched queue, merge (AC-3)

## Check
- [ ] `npm test` and `npm run typecheck` pass
- [ ] Each acceptance criterion is checked: pick from the list, type a missing one, an admin matches it, search finds it, guide values come out right
