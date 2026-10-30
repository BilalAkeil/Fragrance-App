# 004: Orders and shipping

- **Status:** Draft
- **Design:** none yet. Bilal's canvas has a Checkout frame that covers the delivery choice (not yet checked against the canvas). Orders and order detail need designing.
- **Depends on:** 003 (orders are created on payment)

## Why

Once an order is paid, both sides need to know what happens next. The seller gets a prepaid label and has 5 working days to send the item. Tracking updates on its own. The buyer gets 48 hours after delivery to say everything's OK or report a problem. After that the order completes and the seller is paid. This copies Vinted, as the brief decided.

## Scope

**In:**
- Royal Mail Tracked 24 and Tracked 48, the only UK services that take perfume, priced for checkout through the broker or Royal Mail directly.
- Prepaid labels or QR codes for the seller.
- Automatic tracking.
- The 5-working-day ship-by deadline, with automatic cancellation and refund.
- The 48-hour window after delivery, "Everything's OK", and automatic completion.
- My orders (buying and selling) and an order detail page with a timeline.

**Out (and where it goes instead):**
- Taking the payment and paying the seller: 003.
- What happens after "Report a problem": 008.
- Emails at each step: 010.
- Shipping for swaps: 007 reuses this spec's labels, tracking and deadlines.

## User stories

### US-1: As a buyer, I want live delivery prices so that I can choose how it's sent

- **AC-1.1:** Given my UK address and the listing, then I choose between Royal Mail Tracked 24 and Tracked 48, each with its price and a short description, such as "Tracked 48: usually 2 to 3 working days".
- **AC-1.2:** Given a bottle is over 150ml, then it can't be listed, and the sell form says why (Q-6). Given a parcel breaks another of Royal Mail's perfume rules, then it can't be bought, and the listing says so.
- **AC-1.3:** The parcel size is suggested from the bottle's size and kind, and the seller can change it when listing (Q-4).

### US-2: As a seller, I want a prepaid label so that sending is easy

- **AC-2.1:** Given I've sold an item, then I see a "Ship by <date>" countdown and can download a label or show a QR code for the service the buyer chose.
- **AC-2.2:** I see clear packing guidance for perfume, following Royal Mail's rules:
  - keep the bottle in its retail packaging, inside a strong outer box
  - seal the cap
  - the ID8000 mark is on the label
  - where to hand it in
- **AC-2.3:** Given I don't ship within 5 working days, then the order is cancelled and the buyer refunded in full automatically, and my listing doesn't come back.

### US-3: As a buyer or seller, I want automatic tracking so that nobody has to type tracking numbers

- **AC-3.1:** When the carrier first scans the parcel, then the order moves to Shipped.
- **AC-3.2:** When Royal Mail marks the parcel as delivered, then the order moves to Delivered and the 48-hour window starts.
- **AC-3.3:** The order page shows a timeline with each tracking event and its time.
- **AC-3.4:** Given tracking hasn't shown delivered 7 working days after Royal Mail's due date, then I can report "Not received" (008). I'm refunded in full, and we claim from Royal Mail (Q-5).

### US-4: As a buyer, I want to confirm or report a problem so that the seller only gets paid for what I ordered

- **AC-4.1:** Given my order is Delivered, then I can choose "Everything's OK", and the order completes.
- **AC-4.2:** Given my order is Delivered and I choose "Report a problem" within 48 hours, then completion pauses and a dispute opens (008).
- **AC-4.3:** Given 48 hours pass after delivery without a report, then the order completes on its own.
- **AC-4.4:** Given the order is completed, then the seller is paid (003) and I'm asked to review the seller (005).

### US-5: As a buyer or seller, I want to see my orders in one place

- **AC-5.1:** My orders has Buying and Selling tabs, newest first. Each order shows the item, the other person, its status, and the next action with its deadline.
- **AC-5.2:** The order page shows the item, the price breakdown, the delivery service, the address (to the seller only after payment), the timeline, and the actions open to me.

## Rules

- **R-1:** The ship-by deadline is 5 working days after payment. Working days are Monday to Friday, excluding UK bank holidays (Q-3).
- **R-2:** An order not shipped by its deadline is cancelled and refunded in full: item, postage and Buyer Protection.
- **R-3:** The completion window is 48 hours from Royal Mail's delivered event.
- **R-4:** An order completes when the buyer confirms, or when the window ends with no report.
- **R-5:** Statuses move one way: Paid → Shipped → Delivered → Completed. From Paid, an order can end as Cancelled. From Delivered, it can go to Disputed (then Completed or Refunded, decided in 008).
- **R-6:** Perfume goes by Royal Mail Tracked 24 or 48 only (Q-2):
  - UK addresses only
  - at most 150ml per item, and at most 8 items per parcel
  - in retail packaging, with an ID8000 label

## Data

- **Orders:** add the chosen service, the label and its tracking reference, the ship-by deadline, the delivered time, the completion deadline, and the cancelled status (it isn't in today's `order_status`).
- **Tracking events:** order, time, carrier status and description.
- **Sellers:** a dispatch postcode, so quotes can be priced. Only the seller and server code can see it.
- **Statuses, deadlines and tracking** are set only by server code, from the broker's webhooks and scheduled jobs. That matches today's rule that the apps can't set order status.

## Screens and states

- **Checkout delivery step:** in 003.
- **My orders:** Buying and Selling tabs, plus empty states.
- **Order detail, by status:**
  - Paid: label and ship-by countdown for the seller; "waiting for the seller to send it" for the buyer
  - Shipped
  - Delivered: "Everything's OK" and "Report a problem", with the countdown
  - Completed
  - Cancelled
  - Disputed

## Open questions

Settled on 2026-10-30 with Ben's rule: copy Vinted, and comply with UK law (law wins where they clash). Questions still open say why.

- [ ] **Q-1:** Which shipping broker? This is brief Q-6a. **Proposed:** not Packlink, which prohibits perfume. Use Sendcloud if it confirms it can carry perfume on Royal Mail, otherwise Royal Mail direct. See [the research](../../docs/research/2026-10-26-holds-and-shipping.md). **Still open:** a cost and supplier call that Vinted and the law can't answer.
- [x] **Q-2:** Which services and bottle sizes can carry perfume? This is brief Q-7. **Royal Mail Tracked 24 and 48 only** (Ben and Bilal, 2026-10-26). Evri, InPost and DHL prohibit perfume. Royal Mail's limits are ≤150ml per item, ≤8 per parcel, retail packaging and an ID8000 label. See [the research](../../docs/research/2026-10-26-holds-and-shipping.md).
  - **Found while settling the others (2026-10-30), for Ben and Bilal to check:** Royal Mail's current prohibited and restricted items list (May 2025) says at most **4** perfumes per parcel, and that they must be **handed in at a Post Office counter**. Its Tracked 24 and 48 pages list perfume as restricted, with Tracked 48 open to it only for senders of over 300,000 parcels a year. Confirm with Royal Mail or the broker before launch.
- [x] **Q-6:** What happens to bottles over 150ml? **They're blocked from listing.** Vinted won't list an item too big for any of its shipping options ([Vinted: parcel size limits](https://www.vinted.co.uk/help/1227)), and has no collection-only option in the UK. AC-1.2 updated.
- [ ] **Q-7:** Does a decant atomiser, or a used bottle without its box, count as "retail packaging"? **Still open:** only Royal Mail can answer. Its list says perfume must be "within its original retail packaging", so a decant in an atomiser probably doesn't qualify. Ask Royal Mail before launch.
- [x] **Q-3:** Do bank holidays pause the ship-by countdown? **Yes.** Vinted's deadline is 5 business days, and UK bank holidays aren't business days (Banking and Financial Dealings Act 1971). R-1 already says so.
- [x] **Q-4:** How do we work out parcel size and weight? **We suggest it from the bottle's size and kind, and the seller can change it when listing.** Vinted picks a parcel size from the item's details and lets the seller change it ([Vinted: choosing the right parcel size](https://www.vinted.co.uk/help/51)). Added as AC-1.3.
- [x] **Q-5:** What happens to a lost parcel? **After 7 working days past Royal Mail's due date, the buyer can report "Not received" and is refunded in full. We claim from Royal Mail as the sender.** Vinted refunds in full once a parcel is confirmed lost ([Vinted refund policy](https://www.vinted.co.uk/help/465)). Royal Mail accepts Tracked 24/48 loss claims 7 working days after the due date, and only from the sender. Added as AC-3.4.
