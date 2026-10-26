# 010: Notifications — tasks

## With 003 and 004 (step 4 of the build order)
- [ ] `NNNN_notifications.sql`: notifications and email preferences, plus RLS
- [ ] The `notify()` helper. Raise the 003 and 004 events as they're built

## This feature (step 5)

### Core
- [ ] `notifications.ts`: `NotificationEvent`, `emailFor`, `isOptional`, `shouldEmailMessage`, `remindersDue`; `formatDeadline` in `dates.ts`, plus tests (R-1 to R-3)

### Server and api
- [ ] `lib/email/` with the console provider, the layout and plain text
- [ ] The scheduled job's email step and reminders (AC-1.1, R-1, R-2)
- [ ] Events for PR #3's admin approvals and rejections, and 005's ID results
- [ ] `listNotifications` and `unreadNotificationCount`

### Web
- [ ] The bell, and `/notifications` (AC-1.2)
- [ ] `/account/emails` (AC-2)

### Later features
- [ ] 006, 007 and 008 each raise their events as they're built (that's in their own tasks)

## Check
- [ ] `npm test` and `npm run typecheck` pass
- [ ] Walking an order through with the console provider prints one email per event, the reminders fire at the right times, and a retried job sends nothing twice
