# Fragrance Marketplace

A UK marketplace for buying, selling and swapping fragrances (full bottles, partials and decants). See `README.md` for the repo layout and how to run it.

## How we build: spec first

No feature code without a merged spec.

1. Copy `specs/_template/` to `specs/NNN-short-name/` (next free number).
2. Write `spec.md`: what and why, user stories, acceptance criteria, design link, open questions. No tech choices.
3. Settle every open question, then open a spec-only PR for review.
4. Once merged, write `plan.md` (how) and `tasks.md` (ordered checklist), checked against the rules below.
5. Build the tasks, ticking them off. The feature PR links its spec.

If building shows the spec is wrong, update `spec.md` in the same PR rather than drifting from it.

Product context lives in `docs/product/brief.md`. Designs come from Claude Design and are linked from `docs/design/README.md`.

## Project rules

These apply to every spec, plan and change.

- **Money:** integer pence, GBP. The UK is the only market. Format with `formatGBP` from `packages/core`.
- **Business rules live in `packages/core`:** pure functions with tests next to them (`*.test.ts`). Web and mobile call them and never reimplement them. Fees, certification, decant and listing checks already live there.
- **Data access goes through `packages/api`**, which falls back to `packages/core/src/sample-data.ts` when Supabase isn't configured. Screens must still render with sample data.
- **Security:** every table has row level security. Fields only the platform may set (verification flags, order status, anything about money) are left out of column grants, so only server code using the service role can change them. The `service_role` key never ships in either app.
- **Payments:** Stripe only. Checkout for buyer payments, Connect for seller payouts, Identity for ID checks. Orders are created by server code after payment, never by the apps directly.
- **Schema changes:** a new numbered file in `supabase/migrations/`. Never edit a migration that has already been run. RLS and grants go in the same migration as the table.
- **Platforms:** web first (`apps/web`, Next.js). Mobile (`apps/mobile`, Expo) comes later and reuses `packages/core` and `packages/api`. See `apps/mobile/AGENTS.md` before touching mobile.
- **Placeholders:** values still to be decided (e.g. the Buyer Protection rate) are named constants marked "placeholder" in a comment, never inline numbers.

## Before calling something done

```bash
npm test
npm run typecheck
```

For UI changes, also run `npm run dev:web` and check the flow against its design and the spec's acceptance criteria.
