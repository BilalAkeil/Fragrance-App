# 006: Messaging — tasks

Built after 008, because suspending a user uses 008's `user_flags`.

## Core
- [ ] `messages.ts`: `offPlatformSignals` (email, phone, payment links, bank details), the limits and `validateMessage`, plus tests that include false positives such as prices and sizes (AC-3.1, AC-4, R-4)

## Database
- [ ] `NNNN_messaging.sql`: threads, participants, messages, blocks, reports; RLS; `start_listing_thread`, `admin_thread`, `unread_count`; the `message-photos` bucket and its policies; the Realtime publication
- [ ] Run it on the dev database and check the RLS cases in plan.md

## Server and api
- [ ] `startThread`, `sendMessage` (service client, flag, validation), `blockUser`, `reportMessage`, `reportUser` (AC-1, AC-3, AC-4, AC-5)
- [ ] Order threads created on payment and linked to the listing thread (AC-2)
- [ ] `listThreads`, `getThread` and `unreadCount` in `packages/api`
- [ ] Admin `dismissReport` and `suspendUser`

## Web
- [ ] Messages link and unread count in the header; Message seller on listings; the thread link on orders (AC-1.1, AC-2.1, AC-3.3)
- [ ] `/messages` inbox, and `/messages/[threadId]` with Realtime, photos, the warning before sending and on receipt, the blocked state, and the Block and Report menu (AC-1.2, AC-3, AC-4, AC-5)
- [ ] `/admin/reports` (R-1)

## Check
- [ ] `npm test` and `npm run typecheck` pass
- [ ] Two browsers: messages arrive live, unread counts update, the warning fires on an email address, block stops replies, a report shows up in admin, and an outsider can't open the thread URL
