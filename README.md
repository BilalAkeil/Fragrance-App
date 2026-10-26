# Fragrance Marketplace

A UK marketplace for buying and selling fragrances (full bottles, partials and decants) from certified sellers. One codebase serves the website and the iOS and Android apps.

## Structure

| Folder | What it is |
| --- | --- |
| `apps/web` | Website, built with Next.js |
| `apps/mobile` | iOS and Android app, built with Expo (React Native) |
| `packages/core` | Shared rules used by both: fees, seller certification, decant checks, types |
| `packages/api` | Reads listings and sellers from Supabase, or sample data when no keys are set |
| `supabase/migrations` | Database schema |
| `specs` | One folder per feature: spec, plan and tasks. Start from `specs/_template` |

We build spec first: see `CLAUDE.md` for the workflow and the rules every change follows.

## Rules in `packages/core`

- **Fees:** sellers pay nothing. Buyers pay a Buyer Protection fee (3% + 30p) that covers Stripe card fees (1.5% + 20p standard UK card) and refunds.
- **Certification:** ID verified, plus an average of at least 4 stars once a seller has 5 reviews (the 5 is a placeholder).
- **Decants:** at least 5ml, linked to a registered source bottle whose video has been checked, and capped at the bottle's size.

## Running it

```bash
npm install
npm test            # shared rules
npm run dev:web     # website on http://localhost:3000
npm run dev:mobile  # mobile app via Expo Go
```

Screens use sample data from `packages/core/src/sample-data.ts` until Supabase is connected.

## Setting up Supabase

1. In the Supabase dashboard, open **SQL Editor**, paste `supabase/migrations/0001_init.sql`, and run it. Then do the same with `0002_security.sql`.
2. Open **Project Settings > API** and copy the project URL and the `anon` public key.
3. Website: copy `apps/web/.env.example` to `apps/web/.env.local` and fill in both values.
4. Mobile: copy `apps/mobile/.env.example` to `apps/mobile/.env` and fill in both values.

The `anon` key is safe to ship in the apps because `0002_security.sql` turns on row level security for every table. Never put the `service_role` key in either app.
