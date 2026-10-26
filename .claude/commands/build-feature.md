---
description: Build a feature from its spec, plan and tasks (for example /build-feature 001)
argument-hint: <feature number, e.g. 001>
---

Build feature $ARGUMENTS of the fragrance marketplace, following the spec-first workflow in `CLAUDE.md`.

## 1. Read before touching anything

- `CLAUDE.md` (the project rules) and `docs/architecture.md` (the shared design).
- `specs/$ARGUMENTS-*/spec.md`, `plan.md` and `tasks.md`.
- The "Decisions so far" table in `docs/product/brief.md`. Where it disagrees with the spec, the table wins: update the spec in the same PR and say so.

## 2. Make sure nobody else is building it

Run `git fetch --prune`, then `gh pr list --state open --search "$ARGUMENTS in:title"`, and look for remote branches named `feature/$ARGUMENTS-*`.
- **Someone else has an open PR or branch for this feature:** stop. Say who has it, and don't start.
- **It's yours from an earlier session:** check it out and carry on from the first unticked task.

## 3. Check what the feature needs

Check the "Before starting" line in `tasks.md`, any PRs it depends on, and the accounts it needs:
- **Supabase:** run `list_migrations` and `list_tables` with the Supabase MCP to see which migrations are applied.
- **Stripe:** test keys must be in `apps/web/.env.local`.

If anything is missing, stop. List exactly what's missing and who can provide it.

## 4. Claim it

1. Create `feature/$ARGUMENTS-<short-name>` from the latest `main`.
2. Push it.
3. Straight away, open a **draft** PR titled "Build $ARGUMENTS: <feature name>" that links the spec. This draft PR is how the other person knows the feature is taken.

## 5. Build, top to bottom through `tasks.md`

- **Core first:** rules in `packages/core`, as pure functions with tests.
- **Migrations:**
  1. Write a new file in `supabase/migrations/`, using the next free number.
  2. Apply it to the development project with the Supabase MCP `apply_migration`, using the same name.
  3. Run `get_advisors` (security), and fix anything new.
  4. Check every RLS case listed in `plan.md` with `execute_sql`. Test as the right role and user: `set local role authenticated` and `request.jwt.claims` inside a transaction that you roll back.
  5. Never edit a migration that has already been applied.
- **Server, api, then web,** as the plan lays out. Screens must still render with sample data.
- **Commit as each group of tasks lands,** tick the tasks in `tasks.md`, and push.
- **Don't guess what isn't settled.** If the plan assumed an answer to an open question, keep that assumption visible in the PR.
- **Secrets:** never commit them, and never put a server-only key in a `NEXT_PUBLIC_` variable.

## 6. Before calling it done

- Run `npm test` and `npm run typecheck`.
- Run the site and check every acceptance criterion in `spec.md`. Do it with sample data and with the development database.
- Mark the PR ready for review. The description says what was built, what was checked and how, any assumed answers, and anything left unticked.
