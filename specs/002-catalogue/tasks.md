# 002: Fragrance catalogue — tasks

## Core
- [x] `catalogue.ts`: `Concentration`, `normaliseName`, `guidePricePerMl`, `guideValuePence`, plus tests for full, partial, decant and no-price cases (R-3, R-4, AC-4)

## Database
- [x] `0006_catalogue.sql`: pg_trgm; houses, fragrances, sizes, price-change history and its trigger; `fragrance_id` on listings and bottles; RLS; `admin_merge_fragrance`
- [x] Run it on the dev database and check the RLS cases in plan.md (plus `0007_catalogue_security.sql` and `0008_catalogue_accents.sql`, fixes after it ran)

## Server and api
- [x] `/api/catalogue/search` route
- [x] `searchCatalogue`, `getFragranceSizes` and `getGuideValue` in `packages/api`, with sample catalogue data
- [x] `scripts/import-catalogue.ts`, and a starter CSV with the sample fragrances
- [x] Admin actions: add and edit, set guide price, match an unmatched listing, merge (AC-3)

## Web
- [x] House and fragrance pickers with the free-text fallback in ListingForm and BottleForm (AC-1)
- [x] House filter on browse (AC-2.2)
- [x] `/admin/catalogue` list, the fragrance page with sizes and price history, the Unmatched queue, merge (AC-3)

## Check
- [ ] `npm test` and `npm run typecheck` pass
- [ ] Each acceptance criterion is checked: pick from the list, type a missing one, an admin matches it, search finds it, guide values come out right
