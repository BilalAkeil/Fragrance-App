# 008: Disputes and refunds — tasks

Build after 003 and 004, and before 006 (which uses `user_flags`).

## Core
- [ ] `disputes.ts`: reasons, `canReport`, the state machine, constants, `refundFor`, plus tests (R-1, R-3, R-4, AC-1.4)

## Database
- [ ] `NNNN_disputes.sql`: disputes, evidence, `shipments.dispute_id`, `user_flags` and hiding suspended sellers' listings, the order transitions, RLS, and the `dispute-evidence` bucket
- [ ] Run it on the dev database and check the RLS cases in plan.md

## Server and api
- [ ] `reportProblem` (AC-1)
- [ ] `respondToDispute`, plus the return label (AC-2, AC-3.2)
- [ ] `acceptPartialOffer` (AC-3.1)
- [ ] Scheduled job steps: seller didn't respond, return delivered, return not sent (AC-2.2, AC-3.2)
- [ ] Admin `decideDispute`, including what happens to a fake (AC-4.2, AC-4.3, R-6)
- [ ] `getDispute` and `listDisputes`

## Web
- [ ] "Report a problem" live on `/orders/[id]`, and `/orders/[id]/report` (AC-1)
- [ ] `/disputes/[id]` for both sides (AC-2, AC-3)
- [ ] `/admin/disputes` queue and decision page (AC-4)

## Check
- [ ] `npm test` and `npm run typecheck` pass
- [ ] Stripe test mode with the `fake` provider: each reason; the seller offers a partial refund and the buyer accepts; full refund with a return; no response so an admin decides; an upheld fake suspends the seller and hides their listings
