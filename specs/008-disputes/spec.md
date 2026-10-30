# 008: Disputes and refunds

- **Status:** Draft
- **Design:** none yet. Report-a-problem, dispute detail and the admin dispute queue need designing. Not yet checked against Bilal's canvas.
- **Depends on:** 003 (refunds), 004 (orders and the 48-hour window), 007 (swaps), 009 (admin console)

## Why

Buyer Protection and Swap Protection are only real if problems get sorted out fairly. Within 48 hours of delivery, a buyer or swapper can report one of four problems: the item didn't arrive, isn't as described, is damaged or leaking, or they think it's fake. The other side can respond, we decide, and the money goes where the decision says.

## Scope

**In:**
- Reporting a problem on an order or a swap side, with evidence.
- The other side's response.
- Agreeing a refund between the two people.
- An admin decision.
- Returns.
- Refunds and swap compensation.
- Consequences for sellers found selling fakes.

**Out (and where it goes instead):**
- Cancellation and refund when an order isn't shipped: 004 (automatic, no dispute).
- The admin queue screens: 009 lists them, and this spec defines what they need.

## User stories

### US-1: As a buyer, I want to report a problem so that I'm not stuck with it

- **AC-1.1:** Given my order is Delivered and inside the 48-hour window, when I choose "Report a problem", then I pick a reason:
  - Not received
  - Not as described (wrong item, size, fill or condition)
  - Damaged or leaking
  - I think it's not genuine
- **AC-1.2:** I describe the problem and add photos. For "not genuine", I'm asked for photos of the batch code, the bottle base and the box.
- **AC-1.3:** When I submit, then the order is Disputed, the seller isn't paid, and the seller is told (010).
- **AC-1.4:** Given tracking hasn't shown delivered 7 working days after Royal Mail's due date (Q-4), then I can report "Not received" from the order page. I'm refunded in full, and we claim from Royal Mail.

### US-2: As a seller, I want to respond so that my side is heard

- **AC-2.1:** I have 2 working days to respond. I can accept a full refund with a return, offer a partial refund that lets the buyer keep the item, or ask us to decide, with my explanation and photos.
- **AC-2.2:** Given I don't respond in time, then an admin decides.

### US-3: As a buyer and seller, I want to settle it between us where we can

- **AC-3.1:** Given the seller offers a partial refund and I accept, then I'm refunded that amount, the order completes, and the seller is paid the rest.
- **AC-3.2:** Given a full refund with a return is agreed, then I get a prepaid return label. I pay for it, unless the seller offers to (Q-1), and its cost comes off my refund. I'm refunded once tracking shows the item back with the seller, or after 48 hours if the seller doesn't report a problem with the return. If the return is lost or damaged in the post, I'm not charged for it.

### US-4: As an admin, I want everything in one place to decide fairly

- **AC-4.1:** The dispute queue shows open disputes, oldest first. Each one shows:
  - the order or swap
  - both sides' statements and photos
  - the listing as it was when bought
  - tracking
  - the message thread (006)
- **AC-4.2:** I decide one of: full refund with return, full refund without return, partial refund, or no refund. I give a reason that both sides see.
- **AC-4.3:** Given I decide an item isn't genuine, then the buyer is refunded in full without returning it (Q-2), the listing is removed, the seller gets a strike (R-6), and their other listings are queued for review. Given the evidence isn't strong enough, then it's handled as "not as described", with a return.
- **AC-4.4:** Either side can appeal my decision once, within 14 days, with a reason and any new evidence (Q-3). The appeal is decided by an admin, and that decision is final.

### US-5: As a swapper, I want the same protection

- **AC-5.1:** In a swap, each side can report a problem with the parcel they received, within 48 hours of its delivery.
- **AC-5.2:** Given the decision goes against the sender, then the sender is charged the full guide value of what they sent, and that's paid to the person who reported. The person who reported also gets back their fee and any cash they paid (007, R-10). The swap doesn't complete for either side until it's resolved.

## Rules

- **R-1:** A problem can be reported only within 48 hours of delivery or collection, or as "Not received" once 7 working days have passed since Royal Mail's due date with no delivery (Q-4).
- **R-2:** While a dispute is open, no money moves to the other side, and the order or swap can't complete.
- **R-3:** A full refund returns the item price, postage and Buyer Protection fee. When the buyer pays for a return, the return label's cost comes off the refund (Q-1).
- **R-4:** A partial refund can't be more than the item price.
- **R-5:** Every decision has a reason that both sides can see.
- **R-6:** Each upheld "not genuine" decision gives the seller a warning (a strike). On the 4th, the account is banned (Q-5).

## Data

- **Disputes:**
  - the order or swap side
  - who reported it, the reason and the description
  - the status (open, waiting for seller, waiting for return, decided)
  - the outcome, the refund amount, the decision reason, who decided, and deadlines
- **Evidence:** photos and statements from each side, private to the two sides and admins.
- **Returns:** a label and tracking, reusing 004.

## Screens and states

- **Report a problem:** reason, description, photos, submit.
- **Dispute detail, for both sides:** the timeline of statements, the current status, and the next action with its deadline.
- **Seller response:** the three choices.
- **Return:** label and tracking.
- **Admin dispute queue and decision form:** in 009.

## Open questions

Settled on 2026-10-30 with Ben's rule: copy Vinted, and comply with UK law (law wins where they clash). Questions still open say why.

- [x] **Q-1:** Who pays return postage? **The buyer, for any return, unless the seller offers to pay. It comes off their refund.** Vinted: "When returning an item, the buyer pays for return shipping" ([Vinted: returning an item](https://www.vinted.co.uk/help/272)). It matches the brief. The Consumer Rights Act 2015 doesn't apply, because our sellers are private people, not traders. AC-3.2 and R-3 updated.
- [x] **Q-2:** For "not genuine", is the item returned before the refund? **No. With strong evidence, the buyer is refunded in full and doesn't send it back, so the seller can't relist it. With weak evidence, it's handled as "not as described", with a return.** This copies Vinted ([Vinted: item seems to be counterfeit](https://www.vinted.co.uk/help/1471), and its terms, section 11). AC-4.3 updated.
- [x] **Q-3:** Can either side appeal? **Yes, once, within 14 days.** Vinted allows one appeal against a moderation decision ([Vinted: appeal a moderation decision](https://www.vinted.co.uk/help/1599)), and gives sellers 14 days to dispute a claim. Added as AC-4.4.
- [x] **Q-4:** When can "Not received" be reported, and do we claim from the carrier? **7 working days after Royal Mail's due date, and yes, we claim, as the sender.** Royal Mail accepts Tracked loss claims only after that wait, and only from the sender. Vinted refunds in full once a parcel is confirmed lost. This matches 004 Q-5. AC-1.4 and R-1 updated.
- [x] **Q-5:** How many upheld "not genuine" decisions before a seller is suspended? **A warning each time, and a ban on the 4th.** The decisions table settles this (Bilal, 2026-10-26). 008's plan says one suspends; the table wins, so the plan needs updating. R-6 updated.
