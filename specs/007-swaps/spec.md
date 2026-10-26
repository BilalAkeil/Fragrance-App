# 007: Swaps

- **Status:** Draft
- **Design:** Bilal's canvas, Trade frame (not yet checked against the canvas). The canvas and website call this "Trade" and the brief says "swap". This spec says "swap" until Q-1 is settled.
- **Depends on:**
  - 001
  - 002 (guide values)
  - 003 (card payments)
  - 004 (labels, tracking, deadlines)
  - 005 (ID check and reviews)
  - 006 (the swap thread)
  - 008 (problems)

## Why

Fragrance fans often have bottles they're bored of and bottles they want. Swapping is cheaper for both than selling and buying, but it's risky: each person has to trust the other to send something genuine. Bilal decided we offer swaps at launch. This spec covers how a swap is proposed, agreed, paid for, shipped and completed, and how we protect both sides.

## Scope

**In:**
- Marking listings "Open to swaps", and finding them.
- Proposing a swap: one or more of my items, plus optional cash, for one or more of theirs.
- Counter-offers, accepting, declining and withdrawing.
- On acceptance:
  - Swap Protection fees
  - card holds at each item's guide value
  - paying the cash top-up
- Two-way shipping with labels and tracking, each side's confirmation, completion, releasing the holds and paying out the cash.
- Cancelling when someone doesn't ship.

**Out (and where it goes instead):**
- Disputes about a swapped item: 008, with outcomes defined here.
- Guide prices: 002.

## User stories

### US-1: As an owner, I want to mark items as open to swaps so that people can offer me trades

- **AC-1.1:** On my listing I can switch on "Open to swaps".
- **AC-1.2:** Swap-friendly listings show an "Open to swaps" tag and a "Propose a swap" button. Browse has an "Open to swaps" filter.
- **AC-1.3:** Given my listing has no guide value (002), then I can't switch on "Open to swaps", and I'm told why.

### US-2: As a swapper, I want to propose a swap so that I can get a fragrance I want

- **AC-2.1:** Given my ID is verified (005), when I choose "Propose a swap", then I pick one or more of my open-to-swap items to offer. I can add cash I'll pay, or ask for cash from them.
- **AC-2.2:** Before I send it, I see both sides' items with their guide values, the cash, the Swap Protection fee I'll pay, and the card hold I'll have. I also see that nothing is charged until they accept.
- **AC-2.3:** When I send the proposal, then it appears as a card in our swap thread (006), and the other person is told (010).

### US-3: As the receiver, I want to accept, decline or counter

- **AC-3.1:** I can accept, decline, or counter by changing the items or the cash. A counter replaces the open proposal in the thread, and earlier versions stay visible.
- **AC-3.2:** Proposals stay open until one side accepts, someone withdraws or declines, or any item in it is bought or swapped elsewhere (brief, Swap rules).
- **AC-3.3:** Given an item in an open proposal is bought or swapped, then the proposal closes and both people see why.

### US-4: As both swappers, I want the swap secured when it's accepted so that neither of us is exposed

- **AC-4.1:** When a proposal is accepted, then:
  - the accepter pays their Swap Protection fee, their card hold, and any cash they're adding
  - the other person has 24 hours to do the same (Q-6)
- **AC-4.2:** Given both sides have paid, then the swap is confirmed:
  - every item in it is marked as swapped and leaves browse
  - every other open proposal involving those items closes
- **AC-4.3:** Given the second person doesn't pay in time, then the swap lapses, the first person's fee and hold are returned in full, and the items stay available.

### US-5: As both swappers, I want to ship and track both parcels

- **AC-5.1:** Once the swap is confirmed, each of us gets a prepaid label for our own parcel and a "Ship by <date>" deadline 5 working days away (004).
- **AC-5.2:** The swap page shows both parcels' timelines side by side.
- **AC-5.3:** Given my parcel has shipped and theirs hasn't, then they're reminded (010). I'm told they have until their deadline.

### US-6: As a swapper, I want to confirm what I received or report a problem

- **AC-6.1:** When my incoming parcel is delivered or collected, then I have 48 hours to choose "Everything's OK" or "Report a problem" (008). If I do neither, my side confirms itself after 48 hours.
- **AC-6.2:** Given both sides are confirmed, then the swap completes:
  - both holds are released
  - any cash top-up is paid to the person receiving it
  - we're both asked to review each other (005)

### US-7: As a swapper, I want protection if the other person doesn't ship

- **AC-7.1:** Given one side hasn't shipped by their deadline, then the swap is cancelled:
  - the person who did ship gets their item back at our cost
  - their fee and hold are returned
  - any cash they paid is refunded
- **AC-7.2:** The person who didn't ship is charged the full guide value of the items they promised, and that money is paid to the other person as compensation (Bilal, 2026-10-26).

## Rules

- **R-1:** Only ID-verified users can propose or accept swaps.
- **R-2:** Every item in a swap is an active listing of the person offering it, marked "Open to swaps", with a guide value (002).
- **R-3:** Anything can be swapped: full bottles, partials and decants, in any mix. Decants follow the same rules as in sales (001).
- **R-4:** Each side's card hold equals the total guide value of the items they're sending (002, R-3 and R-4).
- **R-5:** Each side pays one Swap Protection fee per swap (amount: Q-3).
- **R-6:** Cash goes in one direction only, is paid at confirmation, is held, and is paid out on completion.
- **R-7:** A swap moves through these states:
  - Proposed
  - Accepted (waiting for the second payment)
  - Confirmed
  - In transit
  - Completed

  It can also end as Declined, Withdrawn, Lapsed, Closed (an item went elsewhere), Cancelled (someone didn't ship), or Disputed (008).
- **R-8:** Nothing is charged before acceptance.
- **R-9:** Each side pays the postage for the parcel they send, chosen when they pay (Q-5).
- **R-10:** When a swap fails because one side doesn't ship or sends a fake (decided in 008), the side at fault is charged the full guide value of the items they promised, which is paid to the other side. The other side also gets back their Swap Protection fee and any cash they paid.

## Data

- **Swaps:** the two people, the state, the cash amount and direction, and the deadlines.
- **Swap items:** the swap, the listing, which side sends it, and its guide value when the swap was proposed.
- **Proposal versions:** for counters. The swap's own record holds the latest.
- **Payments per side:** fee, hold, cash and their Stripe references. Only server code writes these.
- **Shipments per side:** reuse 004's labels and tracking events.
- **Listings:** add an "Open to swaps" flag, and a swapped status alongside sold.

## Screens and states

- **Listing:** "Open to swaps" tag and a "Propose a swap" button.
- **Propose a swap:** pick my items, add or request cash, then a summary with fees and holds.
- **Swap card in the thread:** proposed, countered, accepted, declined, withdrawn or closed.
- **Swap detail:**
  - the terms
  - each side's payment status
  - both shipping timelines with ship-by countdowns
  - confirm or report actions
  - completed, cancelled and lapsed states
- **My swaps:** active and past.

## Open questions

- [ ] **Q-1:** "Swap" or "Trade" for users? This is brief Q-12.
- [x] **Q-2:** When someone doesn't ship or sends a fake, what does it cost them? **The full guide value of what they promised, paid to the other person, who also gets their fee and cash back** (Bilal, 2026-10-26, PR #8). How it's collected depends on Q-4. The Trade design's copy needs updating to match.
- [ ] **Q-3:** What's the Swap Protection fee? This is brief Q-2; Buyer Protection is settled at 3% + 30p. Does Buyer Protection also apply to the cash part?
- [ ] **Q-4:** A card hold normally lasts 7 days, and a swap can run longer. Do we take a deposit and refund it, use extended holds, or re-hold near expiry? This is brief Q-4. It changes the words users see: "hold" or "deposit".
- [ ] **Q-5:** Does each side pay their own postage (as R-9 assumes)?
- [ ] **Q-6:** How long does the second person have to pay after acceptance (24 hours is assumed)?
- [ ] **Q-7:** Can people list something only for swapping, with no sale price?
- [ ] **Q-8:** Is there a limit on how many items each side can include, or on how big the cash top-up can be?
