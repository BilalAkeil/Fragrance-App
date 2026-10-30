# Architecture

The shared design every feature plan builds on. The rules in `CLAUDE.md` still apply. This file covers how the pieces fit together, so each `specs/NNN/plan.md` can stay short and they don't contradict each other.

## Layers

| Layer | What lives there | Rules |
| --- | --- | --- |
| `packages/core` | Money, fees, listing and decant rules, state machines (order, swap, dispute), deadlines and working days, guide values | Pure functions, no I/O, tested with vitest. Web and mobile only call them. |
| `packages/api` | Reads for screens (listings, sellers, bottles, catalogue) | Falls back to `sample-data.ts` when Supabase isn't configured, so screens always render. |
| `apps/web` | Pages (server components), user actions (server actions), webhooks and scheduled jobs (route handlers) | No business rules of its own: it calls `packages/core`. |
| `supabase/migrations` | Tables, RLS, grants, triggers, security-definer functions | One migration per feature, taking the next free number when it's built. RLS and grants go in the same file. |

## Who writes what

- **What a person does** (list, edit, message, propose) goes through the **user's own Supabase client** (`lib/supabase/server.ts`), so RLS and column grants protect it.
- **What the platform does** goes through a **service-role client**: payments, order and swap state, deadlines, verification flags, payouts.
  - It lives in a new `apps/web/src/lib/supabase/service.ts`, marked `import "server-only"`, using `SUPABASE_SERVICE_ROLE_KEY`.
  - It's used only in webhooks, the scheduled job and admin actions, after checking `is_admin()`.
  - Platform-only columns stay out of the column grants.
- **Admin screens** live under `/admin` (from PR #3). They check `is_admin()` in the layout, and the database checks it again for every write: a security-definer function, or the service client after the check.

## Payments (Stripe)

- **Sellers:** Stripe Connect **Express** accounts for payouts, onboarded with Account Links. `account.updated` webhooks keep `sellers.payouts_ready` current.
- **Buying:**
  - One PaymentIntent on the platform account per order, through an embedded Checkout Session.
  - It uses **separate charges and transfers**: the money stays with the platform until the order completes. Then a Transfer sends the item price to the seller's account, with `transfer_group` set to the order id.
  - Refunds use the Refunds API.
- **Swaps:**
  - Each side pays its fee, its deposit (equal to its items' total guide value), and any cash top-up, as ordinary captured payments.
  - The deposit and cash are refunded or transferred when the swap completes or fails.
  - Deposits replace card holds; see `docs/research/2026-10-26-holds-and-shipping.md`.
- **ID checks:** the ID check inside Connect onboarding (005 Q-5, settled by copying Vinted, whose payments provider does it). A seller is verified once payouts are ready and the date of birth Stripe verified makes them 18 or over.
- **Webhooks:**
  - one route, `/api/webhooks/stripe`, which verifies the signature
  - each event's id is stored in `webhook_events` before it's handled, so a resent event does nothing
  - handlers only call the service client and `packages/core`
- **Fees:** the fees come from `packages/core/src/fees.ts`. Amounts sent to Stripe are integer pence.

## Shipping (Royal Mail Tracked 24/48)

- **A `ShippingProvider` interface** in `apps/web/src/lib/shipping/`:
  - `quote(parcel, toPostcode)` returns Tracked 24 and 48 prices
  - `createLabel(shipment)` returns the label PDF or QR code and the tracking reference
  - `parseWebhook(request)` returns tracking events
- **Implementations:**
  - `fake`: fixed prices, with tracking that an admin can step through. Used in development and tests until the broker is chosen.
  - `sendcloud` or `royalmail`: whichever wins research Q-6a. Picked with the `SHIPPING_PROVIDER` env var.
- **Parcels:** the parcel's size class comes from the listing, using a function in `packages/core`. Royal Mail's perfume limits are checked in `packages/core`: UK only, ≤150ml per item, ≤8 per parcel.
- **Tracking:** events arrive at `/api/webhooks/shipping`. Polling is the fallback if the provider has no webhooks.

## Deadlines and the scheduled job

- **Deadlines are columns,** for example `ship_by`, `complete_after`, `respond_by` and `pay_by`. Nothing is held in memory.
- **One scheduled route,** `/api/cron/tick`, runs every 15 minutes and is protected by `CRON_SECRET`. Each step is a single idempotent update, `… where status = X and deadline < now() returning …`, followed by its side effects (refund, transfer, email). The steps:
  - cancel orders that weren't shipped
  - complete orders and swaps
  - lapse unpaid swaps
  - send reminders
- **Scheduling:**
  - It runs on Vercel Cron, which needs Vercel Pro to run more often than once a day.
  - If we stay on Hobby, Supabase `pg_cron` calls the route instead.
- **Working days:** `addWorkingDays()` in `packages/core` skips weekends and UK bank holidays. The holiday list is copied from gov.uk's `bank-holidays.json` and refreshed yearly.

## State machines

- **Order, swap and dispute states:** each one's states and allowed moves are a table in `packages/core`, with a `next(state, event)` function and tests.
- **The database checks transitions too:** a status column can only be changed by the service client, through a function that checks the move is allowed.

## Notifications

- **Raising one:** `notify(userId, event, link)` writes a row to `notifications`. That's the in-app list.
- **Sending emails:** the scheduled job sends emails for rows that haven't been emailed yet, and marks them emailed. Sending this way (an outbox) means a retry never sends twice.
- **Providers:** email goes through an interface in `apps/web/src/lib/email/`. The `console` implementation is for development. The real provider is chosen in 010 Q-1 (Resend is suggested).

## Storage buckets

| Bucket | Who can read | Added in |
| --- | --- | --- |
| `listing-photos` | Everyone | Existing |
| `bottle-videos`, `receipts` | Owner and admins | Existing |
| `message-photos` | The thread's participants, and admins for a report or dispute | 006 |
| `dispute-evidence` | Both sides of the dispute, and admins | 008 |

Every upload goes in a folder named after the uploader's user id, as `lib/upload.ts` does today.

## Environment variables

| Name | Where | Added in |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Web, mobile | Existing |
| `SUPABASE_SERVICE_ROLE_KEY` | Web server only | 003 |
| `NEXT_PUBLIC_SITE_URL` | Web | 003 |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Web | 003 |
| `SHIPPING_PROVIDER` and that provider's keys | Web server only | 004 |
| `CRON_SECRET` | Web server only | 004 |
| `EMAIL_PROVIDER` and that provider's key | Web server only | 010 |

Every server-only key stays out of `NEXT_PUBLIC_*` and never reaches either app.

## Testing

- **Rules:**
  - `packages/core`: every rule, state move and deadline, with vitest
  - `packages/api`: the row mappers
- **Migrations:** run on a local Supabase (Docker + Supabase CLI) or a separate dev project. Each plan lists the RLS cases to check: who can read, who is refused.
- **Screens:** checked in the browser against the spec's acceptance criteria, first with sample data and the `fake` providers, then against the dev project.
- **Stripe:** test mode with test cards, and `stripe listen` to forward webhooks locally.
