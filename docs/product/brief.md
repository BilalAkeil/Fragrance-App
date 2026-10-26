# Product brief

- **Status:** Draft, for Ben and Bilal to agree
- **Working name:** TBC. A shortlist is ready and recommends "Pass the Scent"; Bilal hasn't picked yet.
- **Design:** [website design canvas](https://claude.ai/artifact/TKetzr4s94dqRjyZ4SH1hX), light blue theme. See `docs/design/README.md`.

## Decisions so far

Bilal's decisions, so specs can be checked against them. Where the brief adds detail, it must not contradict these.

| Decision | Date |
| --- | --- |
| UK only, prices in GBP | 2026-10-25 |
| A website and a mobile app | 2026-10-25 |
| "Certified" means a verified seller: ID checked, proof of purchase where possible, and an average of at least 4★ | 2026-10-25 |
| Decants allowed: at least 5ml, labelled, and the source bottle proven by video | 2026-10-25 |
| Free for sellers. Buyers pay a Vinted-style Buyer Protection fee at checkout | 2026-10-25 |
| The seller chooses the carrier (Evri, InPost, Royal Mail or others). Postage is quoted live once the buyer enters their address | 2026-10-25, 2026-10-26 |
| Users can swap (trade) fragrances | 2026-10-26 |
| An offer stays open until it is accepted or the item is bought, then the item is marked sold | 2026-10-26 |
| Money is held until both sides confirm, or 48 hours after delivery or collection | 2026-10-26 |
| Light blue theme | 2026-10-26 |

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
- **Payment is held** until the order completes. An order completes when the buyer taps "Everything's OK", or automatically **48 hours after tracking shows it delivered, or collected from a locker or pickup point,** if they haven't reported a problem. Reporting a problem in that window pauses completion and opens a dispute.
- **The seller is paid** into their Stripe Connect account when the order completes.

## Core loops

**Buy**
1. Browse or search.
2. Open a listing.
3. Enter an address, pick one of the seller's delivery services at its live price, and pay: item + postage + Buyer Protection. The item is marked sold and any open swap proposals for it close.
4. Seller gets a prepaid label and ships within 5 working days, or the order is cancelled and refunded.
5. Delivered, or collected from a locker or pickup point.
6. Buyer confirms, or it auto-completes after 48 hours.
7. Seller is paid.
8. Buyer reviews the seller.

**Swap**
1. Mark items as "Open to swaps".
2. Someone proposes "my item(s) (+ optional cash) for your item(s)".
3. Counter-offers in the message thread, then the other person accepts. Proposals stay open until then, and nothing is charged before acceptance.
4. Both pay the Swap Protection fee, and a hold is placed on each card for their own item's value. Whoever adds cash pays it now.
5. Both get prepaid labels and ship within 5 working days.
6. Both items are delivered or collected.
7. Each side confirms, or it auto-completes 48 hours after delivery or collection.
8. Holds are released, and any cash top-up is paid out.
9. Both review each other.

If someone doesn't ship by the deadline, or sends a fake (decided in a dispute), their hold is charged to compensate the other person.

## Swap rules (decided)

- **Anything can be swapped:** full bottles, partials and decants, in any mix.
- **Proposals stay open** until the other person accepts or someone buys the item. Either way, every item in the deal is marked sold and every other open proposal involving those items closes.
- **Same listing rules as sales:** decants in a swap follow the decant rules below.
- **Cash top-ups are allowed.** The cash is paid through Stripe like a purchase, held, and released when the swap completes.
- **Protection:** both people pay a Swap Protection fee, plus a card hold for the value of the item they're sending.
- **Shipping:** both ship within the same deadline, Vinted's ship-by window of **5 working days**. Neither has to go first, and the platform chases late senders. If one side misses the deadline, the swap is cancelled: the person who shipped gets their item back at our cost, and the late sender's hold is charged.
- **Hold value:** the hold is the **catalogue guide price** for that fragrance and size, scaled for partial fill or decant ml (see 002). Both people see both values before accepting.

## Shipping (Vinted-style)

- **The seller chooses the carriers.** Each seller picks which delivery services they'll use (for example Evri, InPost lockers, Royal Mail Tracked 48).
- **Live postage quotes:** once the buyer enters their address, each of the seller's services is priced live for that postcode and parcel through a shipping broker that covers several carriers (Sendcloud or Packlink, see Q-6a). The buyer picks one of those and pays for postage.
- **Prepaid labels:** the seller gets a label or QR code for that service to drop off.
- **Tracking is automatic.** Tracking comes from the carrier, so nobody types tracking numbers, and "delivered" or "collected" comes from the carrier too. This is what starts the 48-hour completion window.
- **Ship-by:** 5 working days, then the order is cancelled automatically and the buyer refunded. The same applies to each side of a swap.
- **Replaces the seller's postage price:** the current `postage_pence` set by the seller goes away. Postage is the live price of the service the buyer picks, and it pays for the label, so it isn't paid out to the seller.

## Trust model

- **ID before listing:** everyone verifies their ID (Stripe Identity) before they can list or swap. Buyers who only buy don't need to.
- **Certified sellers:** ID checked with Stripe Identity, proof of purchase shared where possible, and at least 4★ once they have 5 reviews. The ID and rating parts are in `packages/core/src/certification.ts`.
- **Proof of purchase, where possible:** sellers can add a receipt or order confirmation to a listing or a source bottle. An admin reviews it, and an approved one shows a "Receipt verified" tag. It's encouraged, not required, so it never blocks the badge on its own.
- **Photos are required** on every listing.
- **Batch codes are optional on full bottles and partials.** Not every bottle has one. A listing without one shows "No batch code".
- **Decants need a checked source bottle.** Every decant links to a source bottle the seller registered with a video (the whole bottle, the batch code close up, and a paper note with their username and the date, in one take), and it can't go live until we've checked that video. Decants are at least 5ml, and decants from one bottle can never add up to more than its size. Already in `packages/core/src/decants.ts`.
- **Decants are labelled** with the house, fragrance, size, the source bottle's batch code and the date decanted. Listing photos show the label.
- **Buyer Protection and Swap Protection:** disputes for fakes, items not as described, and items that never arrived.
- **Messaging stays in the app**, so we have a record for disputes and can spot people trying to move off-platform.

## Feature map

Each feature becomes `specs/NNN-name/`. The MVP is everything needed to launch with buy, sell and swap.

| # | Feature | Today | Priority |
| --- | --- | --- | --- |
| 001 | **Baseline**: sign-in, profiles, listings, photos, browse/search. Make batch codes optional on full bottles and partials (decants keep their source bottle rules) | Built (document + relax rules) | MVP |
| 002 | **Fragrance catalogue**: one canonical list of houses, fragrances and sizes, with guide prices for swap holds | New | MVP |
| 003 | **Checkout and payments**: Stripe Checkout, Buyer Protection fee, held funds, Connect payouts | Fees only | MVP |
| 004 | **Orders and shipping**: seller's carrier choice, live quotes through a shipping broker, prepaid labels, automatic tracking, 5-day ship-by, "Everything's OK", 48-hour auto-complete | Schema only | MVP |
| 005 | **Verification and reviews**: Stripe Identity before listing, reviews after completion, certification badge | Partial | MVP |
| 006 | **Messaging**: one thread per listing, swap or order, with photos | New | MVP |
| 007 | **Swaps**: open-to-swap items, proposals and counters, cash top-up, protection fee + card hold, dual shipping | New | MVP |
| 008 | **Disputes and refunds**: report a problem, evidence, admin decision, refund or charge the hold | New | MVP |
| 009 | **Admin console**: dispute queue, source-bottle video checks, takedowns, user bans | Partial: video, receipt and manual ID review in PR #3 | MVP |
| 010 | **Notifications**: email for each order, swap and message event | New | MVP |
| 011 | **Price offers** ("Make an offer" on a listing) | New | v1.1 |
| 012 | **Favourites, wishlists and saved searches** with alerts | New | Later |
| 013 | **Mobile app** parity, reusing `packages/core` and `packages/api` | Scaffold | Later (see Q-10) |

## Screens to design

This is the list for Claude Design, grouped by flow. ✅ means a basic version already exists in `apps/web`.

1. **Browse:** home ✅; search results with filters (type, size, condition, house, price, certified only, open to swaps)
2. **Listing:** listing detail ✅, showing photos, seller badge, price breakdown with Buyer Protection, batch code / receipt verified / verified-source badge, Buy and Propose swap buttons
3. **Sell:** create/edit listing ✅ (full / partial / decant, source bottle required for decants, optional receipt, open-to-swaps toggle); my source bottles ✅; my delivery services
4. **Checkout:** address, then the seller's delivery services with live prices; order confirmation
5. **Orders:** my orders (buying / selling); order detail with a tracking timeline, ship-by countdown, label download, "Everything's OK" and "Report a problem"
6. **Swaps:** propose swap (pick my items, add cash); swap detail (terms, protection, both tracking timelines, confirm); my swaps
7. **Messages:** inbox; thread (linked to a listing, swap or order)
8. **Profile:** public seller profile (listings, reviews, certification); account ✅; verify ID (the gate before the first listing); payouts setup
9. **Disputes:** report a problem; dispute detail
10. **Admin:** dispute queue; source-bottle check queue; user and listing moderation
11. **Sign-in** ✅ and empty, error and loading states for each of the above

## Out of scope for MVP

Mobile apps (see Q-10), price offers, auctions, wishlists and alerts, shipping outside the UK, and authentication by us (we don't inspect bottles ourselves).

## Open questions

These need answers before the specs that depend on them are agreed.

- [ ] **Q-1 Name and brand:** what's the working name? Any logo or colours to start the design system from?
  - [x] **Colours:** light blue (Bilal, 2026-10-26), already on the website.
  - [ ] **Name and logo:** Bilal is choosing from a shortlist.
- [ ] **Q-2 Fee levels:** what are the final Buyer Protection and Swap Protection fees? (Buyer Protection is a 4% + 50p placeholder today.)
- [x] **Q-3 Swap deadline:** 5 working days, as Vinted does. Bilal to confirm: the design still shows "[N] working days".
- [ ] **Q-4 Card hold limits:** a standard Stripe card hold expires after 7 days. A swap is 5 working days to ship, plus delivery, plus the 2-day check, so it will usually run past that. Options: take the payment up front and refund it on completion; use Stripe's extended authorisations where the card is eligible; or re-authorise near expiry. To settle in 007's plan, but it changes the wording users see ("hold" vs "deposit, refunded").
- [x] **Q-5 Hold value:** the catalogue guide price.
  - [ ] **Q-5a:** where do the guide prices come from, and how often are they updated? Options: we set them by hand, or derive them from recent sales on the platform with a manual starting value.
- [x] **Q-6 Shipping labels:** prepaid labels, Vinted-style.
  - [ ] **Q-6a:** which shipping broker? The seller picks their carriers and postage is quoted live (Bilal), so we need a broker that covers several UK carriers and returns live prices, labels and tracking. Sendcloud or Packlink.
- [ ] **Q-7 Postage rules:** Royal Mail treats perfume as a flammable liquid with volume limits, and other carriers have their own rules. Which services and bottle sizes do we allow? This depends on Q-6a.
- [ ] **Q-8 Certification:** how many reviews before the 4★ rule applies? (5 is a placeholder.) Do swaps count towards reviews?
- [x] **Q-9 Who can sell or swap:** ID is verified before anyone can list or swap. Buying needs no ID check.
- [ ] **Q-10 Mobile timing:** Bilal wants a website and an app, and the product plan has them launching together. This brief puts the app after the web MVP. Is launching web first OK?
- [ ] **Q-11 What a failed swap costs:** this brief charges the late or dishonest side's card hold to compensate the other person. The design instead says the other person gets their cash and fee refunded. Which do we tell users?
- [ ] **Q-12 Swap or Trade:** this brief says "swap", the design and website say "Trade". Pick one word for users.
