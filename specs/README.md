# Specs

One folder per feature, numbered as in the feature map in `docs/product/brief.md`. Each one starts from `specs/_template/`. Write `spec.md` first (what and why). `plan.md` and `tasks.md` are added just before that feature is built. The workflow is in `CLAUDE.md`.

Where a spec and the brief's "Decisions so far" table disagree, the table wins.

## The MVP specs

| # | Spec | Status | Depends on |
| --- | --- | --- | --- |
| 001 | [Baseline: accounts, listings and browsing](001-baseline/spec.md) | Draft | — |
| 002 | [Fragrance catalogue](002-catalogue/spec.md) | Draft | 001 |
| 003 | [Checkout and payments](003-checkout/spec.md) | Draft | 001, 004, 005 |
| 004 | [Orders and shipping](004-orders-shipping/spec.md) | Draft | 003 |
| 005 | [ID verification, reviews and seller profiles](005-verification-reviews/spec.md) | Draft | 001, 004, 009 |
| 006 | [Messaging](006-messaging/spec.md) | Draft | 001 |
| 007 | [Swaps](007-swaps/spec.md) | Draft | 001–006, 008 |
| 008 | [Disputes and refunds](008-disputes/spec.md) | Draft | 003, 004, 007, 009 |
| 009 | Admin console | In Bilal's PR #3 (bottle, receipt and ID review) | — |
| 010 | [Notifications](010-notifications/spec.md) | Draft | 003–009 |

**009** starts with Bilal's admin review spec in PR #3. Once that's merged, it needs these added:
- the dispute queue and decision form (008)
- catalogue management and the unmatched queue (002)
- message and user reports (006)
- listing takedowns and user suspension

**Designs:** none of these specs has been checked against Bilal's design canvas yet, because it isn't shared with Ben. Each spec names the canvas frame it should match.

## Suggested build order

Each step can be built and released before the next one starts.

1. **001 Baseline:** optional batch codes and source bottles, editing and removing listings, filters.
2. **005 ID verification:** the check before listing, needed before real sellers join.
3. **002 Catalogue:** sellers pick from it, and guide values come from it.
4. **003 + 004 Buying:** checkout, payouts, labels, tracking and completion. These go together, because each needs the other.
5. **010 Notifications** for orders, then **005 Reviews** and seller profiles.
6. **008 Disputes** and their part of **009**.
7. **006 Messaging.**
8. **007 Swaps:** last, because they use everything above.

## Open questions in one place

Every open question from the brief and the specs, grouped by who can answer it. Settle the first group first, because it blocks the most specs.

### Settle first (Ben and Bilal)

| Question | Where | Blocks |
| --- | --- | --- |
| The product name and logo | Brief Q-1 | Design, emails (010), domain |
| Final Buyer Protection and Swap Protection fees, and whether Buyer Protection applies to cash in a swap | Brief Q-2, 003 Q-1, 007 Q-3 | 003, 007 |
| "Swap" or "Trade" for users | Brief Q-12, 007 Q-1 | 007, copy everywhere |
| What a failed swap costs the person at fault: charge their hold, or only refund the other side | Brief Q-11, 007 Q-2 | 007, 008 |
| Is launching web before the mobile app OK? | Brief Q-10 | Scope |
| Do sellers set up payouts before their first listing or their first sale, and does Stripe's payout setup double as the ID check? | 003 Q-2, 005 Q-5 | 003, 005 |

### Product decisions (Ben and Bilal)

**Listings and catalogue**
- **001 Q-1:** Can a decant link to an unchecked bottle, with the badge appearing later?
- **001 Q-2:** Should "Verified source" and "Receipt verified" be search filters?
- **001 Q-3:** A draft state for listings?
- **002 Q-1:** Where does the starting catalogue come from?
- **002 Q-2 (brief Q-5a):** Where do guide prices come from?
- **002 Q-3:** Are flankers and reformulations separate fragrances?
- **002 Q-4:** Should notes come from the catalogue?

**Buying**
- **003 Q-3:** How long does a checkout reservation last?
- **003 Q-4:** Apple Pay and Google Pay at launch?
- **004 Q-3:** Do bank holidays pause the ship-by countdown?

**Trust and reviews**
- **005 Q-1 and Q-2 (brief Q-8):** The review count for certification, and whether swap reviews count.
- **005 Q-3:** The review window, and whether sellers can reply.
- **005 Q-4:** Do sellers review buyers?
- **005 Q-6:** An 18+ age limit?

**Messaging**
- **006 Q-1:** Warn or block when a message contains contact details or payment links?
- **006 Q-2:** How long are messages kept?
- **006 Q-3:** Can unverified users message?

**Swaps**
- **007 Q-5:** Does each side pay their own postage?
- **007 Q-6:** How long does the second person have to pay?
- **007 Q-7:** Swap-only listings?
- **007 Q-8:** Limits on items and cash?

**Disputes**
- **008 Q-1:** Who pays return postage?
- **008 Q-2:** Must fakes be returned before a refund?
- **008 Q-3:** Appeals?
- **008 Q-5:** The suspension threshold for fakes.

**Notifications**
- **010 Q-2:** The in-app notification list in the MVP?

### Research before the plan (Claude can do these)

- **Card holds for swaps that run past 7 days** (brief Q-4, 007 Q-4): deposit and refund, extended holds, or re-holding.
- **Shipping broker** (brief Q-6a, 004 Q-1): Sendcloud or Packlink. Compare live UK quotes, labels, lockers and tracking webhooks.
- **Perfume postage rules by carrier and size** (brief Q-7, 004 Q-2).
- **Parcel size and weight for quotes** (004 Q-4).
- **Lost parcels and carrier claims** (004 Q-5, 008 Q-4).
- **Email provider and sending domain** (010 Q-1).

### Outside help

- **003 Q-5:** Is the Buyer Protection fee subject to VAT? (an accountant)
