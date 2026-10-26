# 008: Disputes and refunds — plan

How we'll build [spec.md](spec.md). Shared design: [docs/architecture.md](../../docs/architecture.md). Built after 003 and 004. The swap side (AC-5) is wired in when 007 is built.

## Approach

- **A dispute belongs to an order**, or later to one side of a swap. It moves through a state machine in core, with deadlines run by the scheduled job.
- **Evidence** goes in the private `dispute-evidence` bucket.
- **Every write goes through server actions** using the service client after checks. Both sides can read their dispute through RLS.
- **The admin queue** at `/admin/disputes` is the 009 piece this feature adds.
- **Assumed answers:**
  - **Q-1:** we pay for return labels. All four reasons are the seller's fault, so the buyer never pays.
  - **Q-2:** items are returned before a full refund, except when they never arrived. That stops a fake being relisted.
  - **Q-3:** no appeals in the MVP.
  - **Q-4:** "not received" opens 7 days after shipping, if there's no delivery scan.
  - **Q-5:** one upheld fake suspends the seller.

## packages/core

| Function | File | Covers |
| --- | --- | --- |
| `DisputeReason` (`not_received`, `not_as_described`, `damaged`, `not_genuine`), plus their labels and the evidence each asks for | new `disputes.ts` | AC-1.1, AC-1.2 |
| `canReport({ orderStatus, shippedAt, deliveredAt, now, reason })`: within 48 hours of delivery, or `not_received` from 7 days after shipping | `disputes.ts` | R-1, AC-1.4 |
| The dispute state machine: `open` → `awaiting_seller` → (`awaiting_return` \| `awaiting_admin`) → `decided` | `disputes.ts` | AC-2, AC-3, AC-4 |
| `SELLER_RESPONSE_WORKING_DAYS = 2`, `RETURN_WORKING_DAYS = 5`, `SUSPEND_AFTER_UPHELD_FAKES = 1` | `disputes.ts` | AC-2.2, R-6 |
| `refundFor(order, outcome, partialPence?)`: a full refund is item + postage + fee; a partial refund is at most the item price | `disputes.ts` | R-3, R-4 |

## Database

**Migration:** `NNNN_disputes.sql`.
- **`disputes`:**
  - what it's about: `id`, `order_id`, `swap_side_id` (its foreign key is added in 007)
  - who and why: `reporter_id`, `respondent_id`, `reason`, `description`, `status`
  - the seller's answer: `seller_choice`, `partial_offer_pence`
  - the result: `outcome`, `refund_pence`, `decision_reason`, `decided_by`
  - deadlines: `respond_by`, `return_by`, `created_at`, `decided_at`
- **`dispute_evidence`** `(dispute_id, uploader_id, statement, photo_path, created_at)`.
- **Returns:** `shipments.dispute_id` (a return shipment reuses 004's table).
- **`user_flags`** `(user_id, suspended_at, reason, upheld_fakes)`: admin only. **The listings select policy** hides listings from suspended sellers.
- **Orders:** `transition_order` allows delivered → disputed → completed or refunded. Paid orders can be disputed as "not received" after 7 days.
- **RLS:** the reporter, the respondent and admins can read the dispute and its evidence. There are no inserts or updates from the apps.
- **The `dispute-evidence` bucket:** private, readable by both sides and admins.

**RLS cases to test:** a third party can't read a dispute or its photos; the apps can't change the outcome; a suspended seller's listings disappear from browse.

## Server

- **`reportProblem(orderId, reason, description, photoPaths)`:** checks `canReport`, creates the dispute, sets the order to `disputed`, sets `respond_by`, and notifies the seller (AC-1.3).
- **`respondToDispute(disputeId, choice, statement, photos, partialPence?)`** (AC-2.1):
  - A full refund with a return issues a return label (our account) and sets `return_by`.
  - A partial offer waits for the buyer.
  - "Ask us to decide" moves it to `awaiting_admin`.
- **`acceptPartialOffer(disputeId)`:** refunds that amount with `refundOrder`, then completes the order and pays the seller the rest (AC-3.1).
- **The scheduled job** (dispute steps):
  - past `respond_by`: move to `awaiting_admin` (AC-2.2)
  - the return is delivered and 48 hours pass: refund in full (AC-3.2)
  - past `return_by`: move to `awaiting_admin`
- **Admin `decideDispute`** (AC-4.2):
  - Records the outcome and the reason.
  - Refunds or completes.
  - For "not genuine" (AC-4.3, R-6): removes the listing, increments `upheld_fakes`, suspends the seller at the threshold, and queues their other listings for review.

## packages/api

`getDispute(id)` (with the evidence, the order, the listing as it was bought, tracking and the return) and `listDisputes(filter)` for admins.

## Web

- **`/orders/[id]`:** "Report a problem" goes live, linking to `/orders/[id]/report` (the reason, description and photo form, asking for the right photos per reason).
- **`/disputes/[id]`:** a timeline of statements and photos, the status, the next action with its deadline, the seller's three choices, the buyer accepting a partial offer, and the return label.
- **`/admin/disputes`:** the queue, oldest first, and a detail page with everything from AC-4.1. The message thread appears once 006 exists. The decision form records the outcome, the amount and the reason.

## Risks and follow-ups

- **Return labels cost us money.** Watch this against the Buyer Protection margin.
- **When 007 lands:** swap disputes reuse this table and flow, with the outcomes from 007's `settleFailed`.
