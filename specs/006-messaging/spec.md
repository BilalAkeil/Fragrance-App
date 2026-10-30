# 006: Messaging

- **Status:** Draft
- **Design:** none yet. Inbox and thread screens need designing. Not yet checked against Bilal's canvas.
- **Depends on:** 001. Threads also attach to orders (004) and swaps (007).

## Why

Buyers ask questions before they buy ("Can you send a photo of the batch code?"), and swaps are negotiated by talking. Keeping messages in the app gives us a record for disputes. It also lets us warn people who try to move the deal somewhere else, which is the most common way marketplace scams start (brief, Trust model).

## Scope

**In:**
- One thread per buyer per listing, per order, and per swap.
- Text and photos.
- Unread counts.
- An inbox.
- Blocking and reporting a user.
- Warnings when a message looks like someone is taking the deal off the platform.

**Out (and where it goes instead):**
- Swap proposals and counter-offers as structured cards in the thread: 007. This spec gives them a place to appear.
- Email alerts for new messages: 010.
- Price offers: 011.

## User stories

### US-1: As a buyer, I want to ask a seller about a listing so that I can decide

- **AC-1.1:** Given I'm signed in and viewing someone else's active listing, when I choose "Message seller", then a thread opens for me, them and this listing, or my existing one opens.
- **AC-1.2:** The thread shows the listing at the top (photo, name and price), linked to its page.

### US-2: As a buyer or seller, I want to talk about an order or swap in context

- **AC-2.1:** Each order and each swap has its own thread, reachable from its page. It shows the order's or swap's status at the top.
- **AC-2.2:** Given a listing thread exists when an order is created, then the order thread links back to it, so the history isn't lost.

### US-3: As anyone, I want to send text and photos and see when I have new messages

- **AC-3.1:** I can send text up to 2,000 characters and up to 4 photos per message.
- **AC-3.2:** New messages appear without reloading.
- **AC-3.3:** The header shows my unread count, and the inbox lists threads with the newest message first, with unread threads marked.

### US-4: As anyone, I want to be warned about scams so that I stay protected

- **AC-4.1:** Given a message I'm about to send contains an email address, phone number, payment link or bank details, then I'm warned that deals made outside the app aren't covered by Buyer Protection, before it sends.
- **AC-4.2:** Given I receive such a message, then it's shown with the same warning.

### US-5: As anyone, I want to block or report someone

- **AC-5.1:** When I block someone, then neither of us can message the other, and they aren't told.
- **AC-5.2:** When I report a message or user with a reason, then it goes to the admin queue (009).

## Rules

- **R-1:** Only the people in a thread can read it. Admins can read a thread only when it's linked to a report or a dispute.
- **R-2:** You can't start a thread on your own listing. Sellers reply in threads that buyers start.
- **R-3:** Photos in messages are private to the thread.
- **R-4:** Sending is rate-limited, for example 20 new threads a day per user, to stop spam.
- **R-5:** Messages and their photos are deleted 12 months after the thread's last message (Q-2). Threads linked to an open report, dispute or appeal are kept until it's closed.

## Data

- **Threads:** the kind (listing, order or swap), the linked item, and the participants.
- **Messages:** thread, sender, text, photos, sent time, and an off-platform warning flag.
- **Read markers:** per participant.
- **Blocks:** who blocked whom.
- **Reports:** reporter, the user or message reported, the reason and the status.
- **Photo storage:** a private bucket, readable only by the thread's participants.

## Screens and states

- **Header:** an unread count.
- **Inbox:** empty state, and a list of threads.
- **Thread:**
  - context card at the top
  - messages, including photo messages
  - composer with the off-platform warning
  - blocked state ("You can't reply to this conversation")
- **Report dialog.**

## Open questions

Settled on 2026-10-30 with Ben's rule: copy Vinted, and comply with UK law (law wins where they clash). Questions still open say why.

- [x] **Q-1:** Warn about contact details and payment links, or block them? **Warn, as written.** Vinted's community standards tell members not to share phone numbers or bank details, and to report anyone who asks. They don't say Vinted blocks these messages ([Vinted: community standards](https://www.vinted.co.uk/help/349)).
- [x] **Q-2:** How long do we keep messages and photos? **12 months after the thread's last message, or longer while a report, dispute or appeal is open.** Vinted's privacy policy (the version in force until September 2025) deleted messages after 12 months. UK GDPR's storage limitation principle means we keep them no longer than needed. R-5 updated.
- [x] **Q-3:** Can anyone message, or only people with a verified ID? **Anyone signed in.** Any Vinted member can message a seller, and buying needs no ID check (005).
