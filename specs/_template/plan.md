# NNN: Feature name — plan

How we'll build the agreed `spec.md`. Check it against the project rules in `CLAUDE.md`.

## Approach

A short summary of the shape of the solution and any choices made, with the reason for each.

## packages/core

New or changed rules (pure functions) and their tests. Map each one to the spec's R-n.

| Function | File | Covers |
| --- | --- | --- |
| | | |

## Database

- **Migration:** `supabase/migrations/NNNN_name.sql`
- **Tables / columns:**
- **RLS policies:** who can select, insert and update what
- **Column grants:** which fields stay platform-only

## Server

Server actions, route handlers and webhooks (Stripe etc.), with what each one checks before writing.

## packages/api

New reads and their sample-data fallback.

## Web

Routes and components, reusing what's already in `apps/web/src/components`.

## Risks and follow-ups

-
