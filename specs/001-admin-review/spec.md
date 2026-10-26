# 001: Admin review queue

- **Status:** Agreed (Bilal asked for it on 2026-10-26; this spec was written after the code, since it predates the spec-first rule)
- **Design:** Admin review queue frame in the website design canvas, https://claude.ai/artifact/TKetzr4s94dqRjyZ4SH1hX
- **Depends on:** the schema and security in `0001_init.sql` and `0002_security.sql`

## Why

Sellers submit proof that the platform has to check by hand: a video of each source bottle before they can sell decants from it, and an optional receipt on a listing. Before this, the only way to approve one was editing tables in Supabase, and sellers were never told why something was turned down.

## Scope

**In:**
- A queue of bottle videos and listing receipts that are waiting for review, oldest first.
- Approve, or reject with a reason that the seller sees.
- A sellers list where an admin marks the ID check by hand.

**Out (and where it goes instead):**
- Automatic ID checks: a later Stripe Identity spec replaces the manual toggle.
- Reported listings, disputes and refunds: they come with the checkout and orders work.
- Adding admins from the website: for now an admin row is inserted in the SQL Editor.

## User stories

### US-1: As an admin, I want one queue of everything waiting for review so that nothing is missed

- **AC-1.1:** Given bottles with no decision and listings with an unreviewed receipt, when I open `/admin`, then I see them all in one list, oldest first, labelled "Bottle video" or "Receipt".
- **AC-1.2:** Given an empty queue, when I open `/admin`, then I see "Nothing waiting".
- **AC-1.3:** Given I am signed in but not an admin, when I open `/admin`, then I see that the page is only for the marketplace team, and no queue data.

### US-2: As an admin, I want to see the evidence and decide so that only genuine bottles are decanted

- **AC-2.1:** When I select a bottle, then its video plays, and I see the bottle claimed, the batch code entered, the receipt if there is one, and a checklist.
- **AC-2.2:** When I approve it, then it leaves the queue, and the seller can choose it on the sell form.
- **AC-2.3:** When I reject without choosing a reason, then nothing changes and I am asked for a reason.

### US-3: As a seller, I want to know why something was rejected so that I can fix it

- **AC-3.1:** Given a rejected bottle or receipt, when I open my account, then I see "Not approved:" and the reason.
- **AC-3.2:** Given a rejected bottle, when its video is replaced, then the rejection is cleared and it returns to the queue. The same applies to a replaced receipt.

### US-4: As an admin, I want to mark a seller's ID as checked until the automatic check exists

- **AC-4.1:** When I open `/admin/sellers`, then I see every seller with their join date, rating and ID check status, and can mark them verified or undo it.

## Rules

- **R-1:** Only admins can approve or reject anything, or change a seller's ID status. This is enforced in the database, not only in the page.
- **R-2:** A rejection always carries a reason.
- **R-3:** A new video or receipt clears an earlier rejection.

## Data

- `admins`: who is an admin. Each user can only see their own row, and no one can add rows from the apps.
- `source_bottles.rejected_at` and `rejected_reason`, and `listings.receipt_rejected_at` and `receipt_rejected_reason`. These are set only by the review functions, and the owner can read them.
- Private bottle videos and receipts can be read by their owner and by admins.

## Screens and states

- `/admin`: the queue and the review panel. Empty state, error on save, and a prompt when a reason is missing.
- `/admin/sellers`: a table of sellers, with an empty state.
- `/account`: shows the rejection reasons.

## Open questions

- [x] Q-1: Who can be an admin? Answer: Bilal for now, added in the SQL Editor.
- [x] Q-2: Do we store ID documents ourselves? Answer: no. The manual toggle stands in until Stripe Identity handles it.
