# 006: Messaging — plan

How we'll build [spec.md](spec.md). Shared design: [docs/architecture.md](../../docs/architecture.md).

## Approach

- **Threads and messages are tables.** Supabase Realtime delivers new messages; it follows RLS, so people only ever receive their own threads.
- **Messages are sent through a server action using the service client,** so the server works out the off-platform flag and the rate limit. Nobody can insert a message directly.
- **Photos** go in the private `message-photos` bucket, in a folder per thread.
- **Admin reports** go in a new queue at `/admin/reports`, part of what 009 needs added.
- **Assumed answers:**
  - **Q-1:** warn, don't block.
  - **Q-2:** messages are kept for 2 years, with no clean-up job yet.
  - **Q-3:** anyone signed in can message. Buyers don't need an ID check.

## packages/core

| Function | File | Covers |
| --- | --- | --- |
| `offPlatformSignals(text)` returns the matches found: email, UK phone number, payment links (PayPal.me, Revolut, Monzo.me and the like), sort code and account number | new `messages.ts` | AC-4 |
| `MAX_MESSAGE_CHARS = 2000`, `MAX_MESSAGE_PHOTOS = 4`, `NEW_THREADS_PER_DAY = 20`, `validateMessage(body, photoCount)` | `messages.ts` | AC-3.1, R-4 |

## Database

**Migration:** `NNNN_messaging.sql`.
- **`threads`:**
  - columns: `id`, `kind` (`listing`, `order` or `swap`), `listing_id`, `order_id`, `swap_id` (its foreign key is added in 007), `previous_thread_id`, `created_by`, `created_at`, `last_message_at`
  - unique on `(listing_id, created_by)` for listing threads, unique on `order_id`, unique on `swap_id`
- **`thread_participants`** `(thread_id, user_id, last_read_at)`.
- **`messages`** `(id, thread_id, sender_id, body, photo_paths text[], off_platform boolean, created_at)`.
- **`blocks`** `(blocker_id, blocked_id)`.
- **`reports`** `(id, reporter_id, thread_id, message_id, reported_user_id, reason, status, created_at)`.
- **RLS:**
  - participants can select their threads and messages
  - only their own `last_read_at` can be updated
  - messages and threads have no insert grant (the server action only)
  - a user can insert and delete their own blocks
  - a user can insert reports, and read their own
- **`start_listing_thread(listing_id)`:** security definer. It refuses your own listing, a listing that isn't active, and anyone over 20 new threads in 24 hours (R-2, R-4). It returns the existing thread if there is one.
- **`admin_thread(thread_id)`:** security definer. It returns the thread's messages only when the caller is an admin and the thread has a report or a dispute (R-1).
- **`unread_count()`** for the header.
- **Storage:** the `message-photos` bucket, private. Paths are `thread_id/user_id/uuid`. Reading needs a participant (or the admin rule). Uploading needs a participant, with folder 2 = `auth.uid()`.
- **Realtime:** `messages` is added to the Realtime publication.

**RLS cases to test:**
- an outsider can't read a thread or its photos
- a blocked sender can't send
- you can't start a thread on your own listing
- the 21st thread in a day is refused
- an admin can read a thread only once it has a report

## Server

- **`startThread(listingId)`:** calls `start_listing_thread`.
- **`sendMessage(threadId, body, photoPaths)`:** checks the sender is a participant and nobody is blocked, runs `validateMessage` and `offPlatformSignals`, then inserts with the service client and updates `last_message_at`.
- **Order and swap threads:** the 003 webhook (and later 007) creates an order thread, linked to the buyer's listing thread through `previous_thread_id`.
- **`blockUser`, `reportMessage`, `reportUser`.**
- **Admin:** `dismissReport`, and `suspendUser`, which uses 008's `user_flags` (so 008 is built before 006).

## packages/api

`listThreads()`, `getThread(id)` (with the context card data), and `unreadCount()`.

## Web

- **Header:** a Messages link with the unread count.
- **Listing page:** a "Message seller" button.
- **Order pages:** a link to the order's thread.
- **`/messages`:** the inbox, with the empty state and unread markers.
- **`/messages/[threadId]`:**
  - the context card (listing, order or swap)
  - live messages (a Realtime subscription)
  - photo messages
  - the composer, which warns before sending when `offPlatformSignals` finds something (AC-4.1)
  - a warning banner on flagged incoming messages (AC-4.2)
  - the blocked state
  - Block and Report in a menu
- **`/admin/reports`:** the queue, the thread in context through `admin_thread`, Dismiss or Suspend.

## Risks and follow-ups

- The off-platform patterns will need tuning against real messages. Keep them in one tested core function.
- Retention (Q-2) needs a clean-up job before we have years of data.
