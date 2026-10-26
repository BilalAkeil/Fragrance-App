# 007: Swaps — plan

How we'll build [spec.md](spec.md). Shared design: [docs/architecture.md](../../docs/architecture.md). Built last, because it reuses 002 (guide values), 003 (payments and transfers), 004 (shipments, deadlines and the scheduled job), 005 (ID check and reviews), 006 (threads) and 008 (disputes).

## Approach

- **A swap has two sides.** Each side pays once, through an embedded Checkout Session, with these lines:
  - the Swap Protection fee
  - a **deposit** equal to their items' total guide value (deposits replace card holds, per the research)
  - any cash top-up they're adding
  - postage for their own parcel
- **Proposals and counters are versions,** and each version snapshots the items and their guide values.
- **Every write goes through server actions** using the service client after checks. Both parties can read their swap through RLS.
- **Assumed answers:**
  - **Q-1:** the user-facing word is "Swap" for now. It's a single constant, so switching to "Trade" is easy.
  - **Q-5:** each side pays its own postage.
  - **Q-6:** 24 hours for the second person to pay.
  - **Q-7:** no swap-only listings.
  - **Q-8:** up to 3 items per side and £500 of cash.
- **A new requirement the spec implies: payouts set up before swapping.**
  - Cash top-ups and Bilal's compensation for a failed swap are paid into the other person's Connect account.
  - So proposing or accepting needs a verified ID **and payouts set up**. This needs Ben and Bilal to confirm.

## packages/core

| Function | File | Covers |
| --- | --- | --- |
| `SWAP_WORD = "swap"`, `SWAP_PROTECTION_FEE` (a placeholder until Q-3, set to at least cover the deposit's card fee: 1.5% of the deposit + 20p, plus the fee itself), `PAY_WINDOW_HOURS = 24`, `MAX_ITEMS_PER_SIDE = 3`, `MAX_CASH_PENCE = 50000` | new `swaps.ts` | R-5, Q-6, Q-8 |
| `validateProposal({ myItems, theirItems, cash })`: owner, active, open to swaps, has a guide value, the limits | `swaps.ts` | R-1 to R-3, R-6 |
| `sideCharges(side, version)` returns the fee, deposit, cash and postage for one person | `swaps.ts` | R-4 to R-6, R-9, AC-2.2 |
| The swap state machine: `SwapStatus` from R-7, plus `nextSwapStatus(status, event)` | `swaps.ts` | R-7 |
| `settleCompleted(swap)` and `settleFailed(swap, atFaultSide)`: the refunds and transfers per side | `swaps.ts` | AC-6.2, AC-7, R-10 |

## Database

**Migration:** `NNNN_swaps.sql`.
- **`listings`:**
  - add `open_to_swaps boolean default false`, in the owner's update grant
  - `listing_status` gains `swapped`
  - add `reserved_swap_id`
- **`swaps`** `(id, proposer_id, receiver_id, status, current_version, accepted_at, pay_by, confirmed_at, completed_at, cancelled_at, at_fault_user_id)`.
- **`swap_versions`** `(swap_id, version, created_by, cash_pence, cash_from_user_id, created_at)` and **`swap_items`** `(swap_id, version, listing_id, from_user_id, guide_value_pence)`.
- **`swap_sides`** `(swap_id, user_id, fee_pence, deposit_pence, cash_pence, postage_pence, payment_intent_id, charge_id, paid_at, ship_by, shipped_at, delivered_at, complete_after, confirmed_at)`.
- **Links from earlier tables:** foreign keys `shipments.swap_side_id`, `threads.swap_id` and `reviews.swap_id`, plus the review insert rule for swaps (each side once, after completion).
- **RLS:**
  - both parties can read their swap and all its rows
  - nobody can insert or update from the apps
  - a listing can only be set open to swaps by its owner, and the server checks it has a guide value

**RLS cases to test:** an outsider can't read a swap; the apps can't change its status or payments; each side can review the other only once, and only after completion.

## Server

**Proposals:**
- `proposeSwap`, `counterSwap`, `declineSwap` and `withdrawSwap` server actions.
  - Each one validates with core and writes a new version.
  - Each one posts a swap card into the swap thread (006) and notifies the other person.

**Paying:**
- `startSwapPayment(swapId)` creates the payer's Checkout Session from `sideCharges`.
  - For the accepter, paying is what accepts the proposal.
- The Stripe webhook, when a side has paid:
  - **The first payment:** the swap becomes `accepted`, `pay_by` is set to 24 hours later, and the items are reserved.
  - **The second payment:** the swap becomes `confirmed`.
    - Its items become `swapped`.
    - Other proposals involving them close.
    - Both shipments and labels are created (004), and `ship_by` is set per side.

**Buying an item that's in an open proposal** (the 003 webhook): the proposals that include it close (AC-3.3).

**The scheduled job** (swap steps):
- **Unpaid at `pay_by`:** the swap lapses, the payer is refunded in full, and the items are released (AC-4.3).
- **A side not shipped at its `ship_by`:**
  - the swap is cancelled
  - `settleFailed` runs: the late side's deposit is transferred to the other person, and the other person's fee, deposit and cash are refunded (R-10)
  - a return label is issued for the item that was already sent (see Risks)
- **A delivered side past its `complete_after`:** it's confirmed automatically.
- **Both sides confirmed:** `settleCompleted` runs. Deposits are refunded, cash is transferred to the person receiving it, and both are asked to review.

**Other actions:** `confirmSwapSide(swapId)` ("Everything's OK"), and "Report a problem", which opens an 008 dispute on that side.

## packages/api

`listSwaps()`, `getSwap(id)` (versions, items, sides, shipments and events), and `listSwappableListings(userId)`.

## Web

- **ListingForm:** an "Open to swaps" toggle, disabled with a reason when there's no guide value (AC-1.3).
- **Listing page and cards:** an "Open to swaps" tag and a "Propose a swap" button.
- **Browse:** an `&swaps=1` filter (AC-1.2).
- **`/swaps/new?listing=`:**
  - pick my items, then add or ask for cash
  - a summary of both sides' items with their guide values, my fee and deposit, and "Nothing is charged until they accept" (AC-2)
- **The swap card in the thread:** each version, with Accept, Counter and Decline, or Withdraw (AC-3).
- **`/swaps/[id]`:**
  - the terms and their history
  - each side's payment status and the Pay button with its countdown
  - both shipping timelines with ship-by countdowns
  - Confirm and Report
  - completed, cancelled and lapsed states (AC-4 to AC-7)
- **`/swaps`:** active and past swaps.

## Risks and follow-ups

- **When one side never ships,** the other side's item has already gone out, and the spec doesn't say how it gets back. This plan issues a return label to the person who didn't ship. If they don't send it back, the person who shipped has lost an item that's covered only by the compensation. **Ben and Bilal need to decide** whether to hold back compensation until the return arrives, or to pay compensation for both items.
- Swaps need the Swap Protection fee (Q-3) and "Swap" vs "Trade" (Q-1) settled before launch, and the payouts requirement confirmed.
