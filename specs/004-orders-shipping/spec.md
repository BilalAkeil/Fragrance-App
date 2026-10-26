# 004: Orders and shipping

- **Status:** Draft
- **Design:** none yet. Bilal's canvas has a Checkout frame that covers the delivery choice (not yet checked against the canvas). Orders and order detail need designing.
- **Depends on:** 003 (orders are created on payment)

## Why

Once an order is paid, both sides need to know what happens next. The seller gets a prepaid label and has 5 working days to send the item. Tracking updates on its own. The buyer gets 48 hours after delivery or collection to say everything's OK or report a problem. After that the order completes and the seller is paid. This copies Vinted, as the brief decided.

## Scope

**In:**
- Live delivery quotes for checkout, from a shipping broker that covers several UK carriers.
- Prepaid labels or QR codes for the seller.
- Automatic tracking.
- The 5-working-day ship-by deadline, with automatic cancellation and refund.
- The 48-hour window after delivery or collection, "Everything's OK", and automatic completion.
- My orders (buying and selling) and an order detail page with a timeline.

**Out (and where it goes instead):**
- Taking the payment and paying the seller: 003.
- What happens after "Report a problem": 008.
- Emails at each step: 010.
- Shipping for swaps: 007 reuses this spec's labels, tracking and deadlines.

## User stories

### US-1: As a buyer, I want live delivery prices so that I can choose how it's sent

- **AC-1.1:** Given my UK address and the listing, then I see each supported delivery service with its live price and a short description, such as "Locker drop-off, 2 to 3 days".
- **AC-1.2:** Given a service can't carry this parcel (for example, perfume limits), then it isn't offered.

### US-2: As a seller, I want a prepaid label so that sending is easy

- **AC-2.1:** Given I've sold an item, then I see a "Ship by <date>" countdown and can download a label or show a QR code for the service the buyer chose.
- **AC-2.2:** I see clear packing guidance for perfume: wrap the bottle, seal the cap, and use the right box size.
- **AC-2.3:** Given I don't ship within 5 working days, then the order is cancelled and the buyer refunded in full automatically, and my listing doesn't come back.

### US-3: As a buyer or seller, I want automatic tracking so that nobody has to type tracking numbers

- **AC-3.1:** When the carrier first scans the parcel, then the order moves to Shipped.
- **AC-3.2:** When the parcel is delivered or collected from a locker or pickup point, then the order moves to Delivered and the 48-hour window starts.
- **AC-3.3:** The order page shows a timeline with each tracking event and its time.

### US-4: As a buyer, I want to confirm or report a problem so that the seller only gets paid for what I ordered

- **AC-4.1:** Given my order is Delivered, then I can choose "Everything's OK", and the order completes.
- **AC-4.2:** Given my order is Delivered and I choose "Report a problem" within 48 hours, then completion pauses and a dispute opens (008).
- **AC-4.3:** Given 48 hours pass after delivery or collection without a report, then the order completes on its own.
- **AC-4.4:** Given the order is completed, then the seller is paid (003) and I'm asked to review the seller (005).

### US-5: As a buyer or seller, I want to see my orders in one place

- **AC-5.1:** My orders has Buying and Selling tabs, newest first. Each order shows the item, the other person, its status, and the next action with its deadline.
- **AC-5.2:** The order page shows the item, the price breakdown, the delivery service, the address (to the seller only after payment), the timeline, and the actions open to me.

## Rules

- **R-1:** The ship-by deadline is 5 working days after payment. Working days are Monday to Friday, excluding UK bank holidays (Q-3).
- **R-2:** An order not shipped by its deadline is cancelled and refunded in full: item, postage and Buyer Protection.
- **R-3:** The completion window is 48 hours from the carrier's delivered or collected event.
- **R-4:** An order completes when the buyer confirms, or when the window ends with no report.
- **R-5:** Statuses move one way: Paid → Shipped → Delivered → Completed. From Paid, an order can end as Cancelled. From Delivered, it can go to Disputed (then Completed or Refunded, decided in 008).
- **R-6:** Only delivery services that can legally carry perfume, at this parcel's size, are offered (Q-2).

## Data

- **Orders:** add the chosen service, the label and its tracking reference, the ship-by deadline, the delivered-or-collected time, the completion deadline, and the cancelled status (it isn't in today's `order_status`).
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

- [ ] **Q-1:** Which shipping broker? This is brief Q-6a. **Proposed:** not Packlink, which prohibits perfume. Use Sendcloud if it confirms it can carry perfume on Royal Mail, otherwise Royal Mail direct. See [the research](../../docs/research/2026-10-26-holds-and-shipping.md).
- [ ] **Q-2:** Which services and bottle sizes can carry perfume? This is brief Q-7. **Found:**
  - Evri, InPost (lockers included) and DHL prohibit perfume.
  - Royal Mail Tracked 24/48 allows it within the UK: ≤150ml per item, ≤8 per parcel, in retail packaging, with an ID8000 label.
  - If that holds, the buyer's choice is Tracked 24 or 48, and "collected from a locker" no longer applies.
  - Still to settle: bottles over 150ml, and whether decants count as retail packaging (ask Royal Mail).
- [ ] **Q-3:** Do bank holidays pause the ship-by countdown?
- [ ] **Q-4:** How do we work out parcel size and weight for a quote? Either from the bottle size and kind, or by asking the seller to pick small or medium.
- [ ] **Q-5:** What happens if tracking never shows delivered (a lost parcel)? Suggestion: after a set number of days, the buyer can report "not received" (008), and we claim from the carrier.
