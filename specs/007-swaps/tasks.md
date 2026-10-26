# 007: Swaps — tasks

Build last. Before starting, check the Swap Protection fee, "Swap" or "Trade", and the payouts requirement with Ben and Bilal.

## Core
- [ ] `swaps.ts`: constants, `validateProposal`, `sideCharges`, the state machine, `settleCompleted`, `settleFailed`, plus tests covering every path in R-7 and R-10

## Database
- [ ] `NNNN_swaps.sql`: `open_to_swaps`, the `swapped` status and `reserved_swap_id`; swaps, versions, items and sides; foreign keys from shipments, threads and reviews; the swap review rule; RLS
- [ ] Run it on the dev database and check the RLS cases in plan.md

## Server and api
- [ ] `proposeSwap`, `counterSwap`, `declineSwap` and `withdrawSwap`, with swap cards in the thread and notifications (AC-2, AC-3)
- [ ] `startSwapPayment`, and the webhook's first and second payment steps: reserve, confirm, mark swapped, close others, labels (AC-4, AC-5.1)
- [ ] Close proposals when one of their items is bought (AC-3.3)
- [ ] Scheduled job: lapse, not shipped (settle, return label), auto-confirm, complete and settle (AC-4.3, AC-6, AC-7)
- [ ] `confirmSwapSide`, and Report a problem through 008
- [ ] `listSwaps`, `getSwap` and `listSwappableListings`

## Web
- [ ] The Open to swaps toggle, tag and filter (AC-1)
- [ ] `/swaps/new`: the proposal builder and summary (AC-2)
- [ ] The swap card in threads (AC-3)
- [ ] `/swaps/[id]` and `/swaps` (AC-4 to AC-7)

## Check
- [ ] `npm test` and `npm run typecheck` pass
- [ ] Stripe test mode with the `fake` provider: propose → counter → accept and pay → second payment → both ship → both confirm → deposits back and cash transferred. Also: a lapse, one side not shipping (settlement and return label), and an item bought while a proposal is open
