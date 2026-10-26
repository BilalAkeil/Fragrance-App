# Product brief

- **Status:** Draft, for Ben and Bilal to agree
- **Working name:** TBC

## What it is

A UK marketplace where fragrance fans **buy, sell and swap** full bottles, partials and decants. It's a clean, trust-first marketplace in the style of Vinted: fast to browse, clear prices, and sellers you can trust.

## Who it's for

| Who | What they want |
| --- | --- |
| Buyer | A genuine bottle at a fair price, with their money protected if it's fake or not as described |
| Seller | To clear bottles they no longer wear without paying fees, and to get paid quickly |
| Swapper | To trade a bottle they're bored of for one they want, safely, with cash to even it out if needed |
| Admin (us) | To keep fakes and scammers out, resolve disputes, and handle checks the platform must do |

## How money works (Vinted-style)

- **Sellers pay nothing.**
- **Buyers pay a Buyer Protection fee** on top of the item price and postage. This is already in `packages/core/src/fees.ts` (placeholder 4% + 50p).
- **Payment is held** until the order completes. An order completes when the buyer taps "Everything's OK", or automatically **2 days after tracking shows it delivered** if they haven't reported a problem. Reporting a problem in that window pauses completion and opens a dispute.
- **The seller is paid** into their Stripe Connect account when the order completes.

## Core loops

**Buy**
1. Browse or search.
2. Open a listing.
3. Pay: item + postage + Buyer Protection.
4. Seller gets a prepaid label and ships within 5 working days, or the order is cancelled and refunded.
5. Delivered.
6. Buyer confirms, or it auto-completes after 2 days.
7. Seller is paid.
8. Buyer reviews the seller.

**Swap**
1. Mark items as "Open to swaps".
2. Someone proposes "my item(s) (+ optional cash) for your item(s)".
3. Counter-offers in the message thread, then the other person accepts.
4. Both pay the Swap Protection fee, and a hold is placed on each card for their own item's value. Whoever adds cash pays it now.
5. Both get prepaid labels and ship within 5 working days.
6. Both items are delivered.
7. Each side confirms, or it auto-completes 2 days after delivery.
8. Holds are released, and any cash top-up is paid out.
9. Both review each other.

If someone doesn't ship by the deadline, or sends a fake (decided in a dispute), their hold is charged to compensate the other person.

## Swap rules (decided)

- **Anything can be swapped:** full bottles, partials and decants, in any mix.
- **Cash top-ups are allowed.** The cash is paid through Stripe like a purchase, held, and released when the swap completes.
- **Protection:** both people pay a Swap Protection fee, plus a card hold for the value of the item they're sending.
- **Shipping:** both ship within the same deadline, Vinted's ship-by window of **5 working days**. Neither has to go first, and the platform chases late senders. If one side misses the deadline, the swap is cancelled: the person who shipped gets their item back at our cost, and the late sender's hold is charged.
- **Hold value:** the hold is the **catalogue guide price** for that fragrance and size, scaled for partial fill or decant ml (see 002). Both people see both values before accepting.

## Shipping (Vinted-style)

- **Prepaid labels:** the buyer chooses a delivery service at checkout and pays for postage. The seller gets a label or QR code to drop off.
- **Tracking is automatic.** Tracking comes from the carrier, so nobody types tracking numbers, and "delivered" comes from the carrier too. This is what starts the 2-day completion window.
- **Ship-by:** 5 working days, then the order is cancelled automatically and the buyer refunded. The same applies to each side of a swap.
- **Replaces the seller's postage price:** the current `postage_pence` set by the seller becomes the price of the delivery service the buyer picks.

## Trust model

- **ID before listing:** everyone verifies their ID (Stripe Identity) before they can list or swap. Buyers who only buy don't need to.
- **Certified sellers:** ID checked with Stripe Identity, and at least 4★ once they have 5 reviews. Already in `packages/core/src/certification.ts`.
- **Photos are required** on every listing.
- **Batch codes are optional.** Not every bottle has one. A listing without one shows "No batch code".
- **Source bottles for decants are optional.** A decant linked to a source bottle whose video we've checked gets a "Verified source" badge. Decants from a linked bottle can never add up to more than the bottle's size.
- **Buyer Protection and Swap Protection:** disputes for fakes, items not as described, and items that never arrived.
- **Messaging stays in the app**, so we have a record for disputes and can spot people trying to move off-platform.

## Feature map

Each feature becomes `specs/NNN-name/`. The MVP is everything needed to launch with buy, sell and swap.

| # | Feature | Today | Priority |
| --- | --- | --- | --- |
| 001 | **Baseline**: sign-in, profiles, listings, photos, browse/search. Make batch codes and decant source bottles optional | Built (document + relax rules) | MVP |
| 002 | **Fragrance catalogue**: one canonical list of houses, fragrances and sizes, with guide prices for swap holds | New | MVP |
| 003 | **Checkout and payments**: Stripe Checkout, Buyer Protection fee, held funds, Connect payouts | Fees only | MVP |
| 004 | **Orders and shipping**: carrier integration, prepaid labels, automatic tracking, 5-day ship-by, "Everything's OK", 2-day auto-complete | Schema only | MVP |
| 005 | **Verification and reviews**: Stripe Identity before listing, reviews after completion, certification badge | Partial | MVP |
| 006 | **Messaging**: one thread per listing, swap or order, with photos | New | MVP |
| 007 | **Swaps**: open-to-swap items, proposals and counters, cash top-up, protection fee + card hold, dual shipping | New | MVP |
| 008 | **Disputes and refunds**: report a problem, evidence, admin decision, refund or charge the hold | New | MVP |
| 009 | **Admin console**: dispute queue, source-bottle video checks, takedowns, user bans | New | MVP |
| 010 | **Notifications**: email for each order, swap and message event | New | MVP |
| 011 | **Price offers** ("Make an offer" on a listing) | New | v1.1 |
| 012 | **Favourites, wishlists and saved searches** with alerts | New | Later |
| 013 | **Mobile app** parity, reusing `packages/core` and `packages/api` | Scaffold | Later |

## Screens to design

This is the list for Claude Design, grouped by flow. ✅ means a basic version already exists in `apps/web`.

1. **Browse:** home ✅; search results with filters (type, size, condition, house, price, certified only, open to swaps)
2. **Listing:** listing detail ✅, showing photos, seller badge, price breakdown with Buyer Protection, batch code / verified-source badge, Buy and Propose swap buttons
3. **Sell:** create/edit listing ✅ (full / partial / decant, optional source bottle, open-to-swaps toggle); my source bottles ✅
4. **Checkout:** checkout with delivery service choice; order confirmation
5. **Orders:** my orders (buying / selling); order detail with a tracking timeline, ship-by countdown, label download, "Everything's OK" and "Report a problem"
6. **Swaps:** propose swap (pick my items, add cash); swap detail (terms, protection, both tracking timelines, confirm); my swaps
7. **Messages:** inbox; thread (linked to a listing, swap or order)
8. **Profile:** public seller profile (listings, reviews, certification); account ✅; verify ID (the gate before the first listing); payouts setup
9. **Disputes:** report a problem; dispute detail
10. **Admin:** dispute queue; source-bottle check queue; user and listing moderation
11. **Sign-in** ✅ and empty, error and loading states for each of the above

## Out of scope for MVP

Mobile apps, price offers, auctions, wishlists and alerts, shipping outside the UK, and authentication by us (we don't inspect bottles ourselves).

## Open questions

These need answers before the specs that depend on them are agreed.

- [ ] **Q-1 Name and brand:** what's the working name? Any logo or colours to start the design system from?
- [ ] **Q-2 Fee levels:** what are the final Buyer Protection and Swap Protection fees? (Buyer Protection is a 4% + 50p placeholder today.)
- [x] **Q-3 Swap deadline:** 5 working days, as Vinted does.
- [ ] **Q-4 Card hold limits:** a standard Stripe card hold expires after 7 days. A swap is 5 working days to ship, plus delivery, plus the 2-day check, so it will usually run past that. Options: take the payment up front and refund it on completion; use Stripe's extended authorisations where the card is eligible; or re-authorise near expiry. To settle in 007's plan, but it changes the wording users see ("hold" vs "deposit, refunded").
- [x] **Q-5 Hold value:** the catalogue guide price.
  - [ ] **Q-5a:** where do the guide prices come from, and how often are they updated? Options: we set them by hand, or derive them from recent sales on the platform with a manual starting value.
- [x] **Q-6 Shipping labels:** prepaid labels, Vinted-style.
  - [ ] **Q-6a:** which carrier(s)? Royal Mail (Click & Drop), Evri, InPost lockers, or a broker (e.g. Packlink, ShipEngine) that covers several.
- [ ] **Q-7 Postage rules:** Royal Mail treats perfume as a flammable liquid with volume limits, and other carriers have their own rules. Which services and bottle sizes do we allow? This depends on Q-6a.
- [ ] **Q-8 Certification:** how many reviews before the 4★ rule applies? (5 is a placeholder.) Do swaps count towards reviews?
- [x] **Q-9 Who can sell or swap:** ID is verified before anyone can list or swap. Buying needs no ID check.
