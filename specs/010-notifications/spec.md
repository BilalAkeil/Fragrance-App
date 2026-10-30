# 010: Notifications

- **Status:** Draft
- **Design:** none yet. Emails use the light blue theme and the wordmark from the [design system](https://claude.ai/artifact/Stv4CqAUrz5UhFbBL6xVmd).
- **Depends on:** 003, 004, 005, 006, 007, 008, 009, which raise the events

## Why

Almost every step in an order or swap has a deadline: 5 working days to ship, 48 hours to confirm, 2 days to respond to a dispute, 24 hours to pay for an accepted swap. People won't sit on the site waiting, so we email them at each step, with a link straight to the thing they need to act on.

## Scope

**In:**
- Transactional emails for orders, swaps, disputes, messages, ID checks and admin decisions.
- Reminders before deadlines.
- An in-app notification list.
- Email settings for the optional emails.

**Out (and where it goes instead):**
- Push notifications: with the mobile app (013).
- Marketing emails and newsletters: not in the MVP, and they'd need separate consent.
- SMS.

## User stories

### US-1: As anyone, I want an email when something needs my attention

- **AC-1.1:** Each event in the table below sends one email to the right person. It says what happened, what to do next and by when, and links straight to the page.
- **AC-1.2:** The same events appear in an in-app list (a bell in the header) with an unread count.

| Area | Event | Who |
| --- | --- | --- |
| Orders | Order placed | Buyer (receipt), seller ("You sold … Ship by …") |
| Orders | Ship-by reminder, 2 working days and 1 working day before the deadline | Seller |
| Orders | Shipped, then delivered or collected ("Confirm within 48 hours") | Buyer |
| Orders | Completed and paid out | Seller |
| Orders | Completed, asking for a review | Buyer |
| Orders | Cancelled because it wasn't shipped | Both |
| Swaps | Proposal received, countered, accepted, declined or closed | The other person |
| Swaps | Payment needed after acceptance, with a reminder after 12 hours | Second person |
| Swaps | Ship-by reminders, delivered, completed, cancelled | Each side |
| Disputes | Opened, response needed, return label ready, decided | Both sides |
| Messages | New message, if still unread after 10 minutes, at most one email per thread per hour | Recipient |
| Account | ID verified or needs more information; payouts ready | The seller |
| Account | Bottle or receipt approved or not approved, with the reason (009) | The seller |

### US-2: As anyone, I want control over optional emails

- **AC-2.1:** In my account I can turn message emails off.
- **AC-2.2:** Emails about money, deadlines and disputes can't be turned off, and the settings page says why.

## Rules

- **R-1:** Every email is sent once per event. A retry never sends a second copy.
- **R-2:** Reminders are skipped if the action has already been done.
- **R-3:** Deadlines in emails use UK time and say the day and date, for example "by Friday 30 October".
- **R-4:** Emails contain no more personal data than needed. Addresses go only to the seller, after payment.

## Data

- **Notifications:** person, event type, the order, swap or dispute it links to, the time it was created, read and emailed.
- **Email preferences:** per user.
- **Scheduled reminders:** they come from the deadlines stored by 004, 007 and 008.

## Screens and states

- **Header:** a bell with an unread count.
- **Notification list:** empty state.
- **Account:** email settings.
- **Email templates:** one layout with the wordmark, a heading, one or two lines, one button, and the footer.

## Open questions

Settled on 2026-10-30 with Ben's rule: copy Vinted, and comply with UK law (law wins where they clash). Questions still open say why.

- [ ] **Q-1:** Which email provider? A plan decision, but it needs a sending domain, which depends on the product name (brief Q-1). **Still open:** a supplier and cost call, waiting on the name.
- [x] **Q-2:** Should the in-app list be in the MVP? **Yes.** Vinted shows notifications in the app as well as by email. AC-1.2 stands.
