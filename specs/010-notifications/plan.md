# 010: Notifications — plan

How we'll build [spec.md](spec.md). Shared design: [docs/architecture.md](../../docs/architecture.md).

## Approach

**Built in two stages:**
1. **The plumbing comes first, with 003 and 004:** the `notifications` table and a `notify()` helper. Every later feature can then raise events as it's built.
2. **This feature adds the rest:** emails (sent from the table by the scheduled job, so a retry never sends twice), deadline reminders, the bell and list in the header, and email settings.

**Assumed answers:**
- **Q-1:** the `console` provider until the domain and name are settled, then Resend.
- **Q-2:** the in-app list is in the MVP, since it's cheap once the table exists.

## packages/core

| Function | File | Covers |
| --- | --- | --- |
| `NotificationEvent`: a union of every event in the spec's table, with its data | new `notifications.ts` | AC-1.1 |
| `emailFor(event)` returns the subject, heading, one or two lines and the button label, in plain UK English | `notifications.ts` | AC-1.1, R-3 |
| `formatDeadline(date)`, for example "by Friday 30 October" in UK time | `dates.ts` | R-3 |
| `isOptional(event)`: only message emails can be turned off | `notifications.ts` | AC-2 |
| `shouldEmailMessage({ unreadSince, lastEmailedForThread, now })`: unread for 10 minutes, and at most once an hour per thread | `notifications.ts` | Messages row |
| `remindersDue(deadlines, now)`: ship-by 2 and 1 working days before; swap payment 12 hours after acceptance | `notifications.ts` | Reminder rows, R-2 |

## Database

**Migration (with 003/004):** `NNNN_notifications.sql`.
- **`notifications`** `(id, user_id, event, entity_id, data jsonb, link, created_at, read_at, emailed_at)`, unique on `(user_id, event, entity_id)`, so each event fires once (R-1).
- **`email_preferences`** `(user_id, message_emails boolean default true)`.
- **RLS:**
  - users can select their own notifications and update only `read_at`
  - users can read and write their own preferences
  - no inserts from the apps

## Server

- **`notify(userId, event, entityId, data, link)`:** inserts with the service client. A duplicate is ignored.
- **`lib/email/`:** the interface, a `console` provider, and later `resend`. One HTML layout (wordmark, heading, lines, one button, footer) plus a plain-text version.
- **The scheduled job's email step:**
  1. sends notifications that haven't been emailed, except optional ones the person has turned off
  2. marks them emailed
  3. adds reminders that are due from `remindersDue`, each with its own key so it's sent once, and skipped if the action is done (R-2)
- **Events added to each feature's actions and webhooks:** 003, 004, 005, 006 (message emails using `shouldEmailMessage`), 007, 008, and PR #3's approve and reject.

## packages/api

`listNotifications(page)` and `unreadNotificationCount()`.

## Web

- **Header:** a bell with the unread count.
- **`/notifications`:** the list, with an empty state. Opening an item marks it read.
- **`/account/emails`:** the message-email toggle. The always-on emails are listed with the reason.

## Risks and follow-ups

- **Sending email from our domain** needs SPF, DKIM and DMARC set up once the name is decided (brief Q-1).
- **The job runs every 15 minutes,** so emails can arrive up to 15 minutes late. That's fine for these events.
