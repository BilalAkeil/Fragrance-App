# Research: swap holds, shipping broker and perfume postage

- **Date:** 2026-10-26
- **For:** settling brief Q-4, Q-6a and Q-7 (specs 004 Q-1 and Q-2, and 007 Q-4) with Bilal
- **Method:** desk research on Stripe's docs and carriers' published rules. Some carrier pages block automated reading, so where a rule comes from a search summary of the carrier's own page, it's marked **(confirm)**. Every recommendation here should be checked with the provider before we build.

## Summary

1. **Card holds:** a normal hold lasts 7 days, and a swap usually runs 10 to 14. **Recommendation:** take each side's swap value as a **deposit, refunded in full when the swap completes**. This works on every card, the money is certain if someone is at fault, and the cost is Stripe's fee on the deposit, about 1.5% + 20p, which the Swap Protection fee should cover.
2. **Perfume postage:** this matters more than which broker we pick.
   - **Evri, InPost (lockers included) and DHL Express ban perfume** on UK parcels.
   - **Royal Mail Tracked 24/48 allows it**, with limits: UK only, at most 150ml per item, at most 8 items per parcel for business senders (4 for personal), in its retail packaging, with an ID8000 label.
   - So the buyer's choice of delivery comes down to Royal Mail Tracked 24 or 48. **Bilal's decision that names Evri and InPost lockers needs revisiting.**
3. **Broker:** **rule out Packlink.** Its help centre lists perfume as prohibited, and its developer docs are thin. **Shortlist Sendcloud or Royal Mail direct (Click & Drop / Shipping API).** Ask both the questions at the end before choosing.

## 1. Card holds for swaps

### The problem
A swap's timeline:
- 5 working days to ship (7 to 9 calendar days, longer with a bank holiday)
- 1 to 3 days in transit
- the 48-hour check

That's **10 to 14 days** in all. Bilal's decision (PR #8) says the side at fault pays the full guide value to the other person, so we need that money to be collectable for the whole swap.

### What Stripe allows
- **A standard online card hold lasts 7 days** for Visa, Mastercard, Amex and Discover when the customer starts the payment. When we start it later, while they're away, Visa allows 5. If the hold expires, the money is released and the payment is cancelled. ([Stripe: place a hold](https://docs.stripe.com/payments/place-a-hold-on-a-payment-method))
- **An extended hold can last up to 30 days**, but only:
  - on Mastercard (any business type), and on Visa for "other" business types at an extra 0.08% per payment
  - not on Amex or Discover for a business like ours, which is limited to hotels, car hire and travel
  - on Stripe's IC+ pricing, or by asking Stripe support
  - and Stripe warns that many networks intend extended holds for cases where *the final amount isn't known yet*. Ours is known, so this needs Stripe to confirm it's allowed.

  ([Stripe: extended authorisation](https://docs.stripe.com/payments/extended-authorization))
- **Saving a card and charging it later** is possible, with the customer's explicit consent to the terms. The later charge can fail, for example if the bank asks the customer to authenticate (`authentication_required`), the card has expired or there isn't enough money. ([Stripe: save and reuse](https://docs.stripe.com/payments/save-and-reuse))
- **Stripe doesn't return its processing fee when we refund.** ([Stripe: fees on refunds](https://support.stripe.com/questions/understanding-fees-for-refunded-payments))

### Options

| Option | Covers 10 to 14 days? | Every card? | Compensation certain? | Cost | Effort |
| --- | --- | --- | --- | --- | --- |
| **A. Deposit, refunded on completion** | Yes | Yes | Yes, we already hold it | Stripe fee on the deposit (≈1.5% + 20p) isn't returned | Low |
| B. Extended hold (30 days) | Yes | No: not Amex or Discover. Visa costs +0.08%, and Stripe has to approve our use | Yes, while the hold lasts | No fee lost if released (confirm with Stripe) | Medium, and needs Stripe's approval |
| C. Standard hold, re-held before it expires | Only if re-holding works | Yes | No: a re-hold can be declined | Low | High |
| D. Save the card, charge only if at fault | n/a | Yes | No: the charge can fail, and then we'd have to pay the other person ourselves | Lowest | Medium |

### Recommendation: A, a deposit
- **Simplest and certain:** it's the simplest thing to build, it works on every card, and it guarantees the compensation Bilal decided on.
- **Most UK cards are debit cards:** there, a hold and a deposit both reduce the person's available balance, so the real differences are the wording ("deposit") and a refund taking a few days to show.
- **The cost:** on a £60 bottle, the deposit costs about £1.10 per side in Stripe fees (1.5% + 20p). **The Swap Protection fee should be set to cover that,** plus the card fee on the fee itself and on any cash top-up. This gives Bilal a floor for brief Q-2.
- **Later:** if extended holds suit us once we're on IC+ pricing, we can switch, with deposits as the fallback for Amex.

**Wording to show users:** "Deposit: £60.00, refunded when the swap completes."

## 2. Perfume postage by carrier (UK domestic)

| Carrier | Perfume on UK parcels? | Source |
| --- | --- | --- |
| **Royal Mail Tracked 24/48** | **Allowed, with limits:** UK addresses only; ≤150ml per item; ≤8 perfumes per parcel for business senders (≤4 for personal); in the original retail packaging inside strong outer packaging; an ID8000 label; the sender's name and return address on the outside. The personal-customer guidance also says these must be handed in at a Post Office counter or Royal Mail shop **(confirm the business rule)** | Royal Mail business and personal guidance, and the Parcelforce PDF (July 2025), via search **(confirm)** |
| **Evri** | **Prohibited.** "Perfumes" and "Aftershaves" are on its UK prohibited list | [Evri: what you can and can't send](https://www.evri.com/send/what-i-can-and-cannot-send) |
| **InPost (lockers and shops)** | **Prohibited.** "No liquids of any kind" | [InPost UK prohibited items](https://inpost.co.uk/prohibited-items) |
| **DHL Express UK** | **Prohibited.** Lists perfumes, aftershaves and eau de toilettes | [DHL Express UK](https://uk.express.dhl.com/what-you-can-and-cant-send/) |
| DPD UK | Not stated by DPD. The Post Office says DPD won't carry flammable goods, so treat it as **no** | [Post Office: DPD prohibited items](https://www.postoffice.co.uk/mail/in-branch-dpd-prohibited-items) |
| Parcelforce | The business guidance is shared with Royal Mail: ≤8 per parcel, ≤600ml in total **(confirm)** | Parcelforce PDF (July 2025), via search |

### What this means for us

- **One carrier family.** For perfume, only Royal Mail (and probably Parcelforce) is open to us. The buyer's choice at checkout becomes Tracked 24 or Tracked 48. Lockers and the "collected" event drop out.
- **Bottles over 150ml can't be posted** with Royal Mail. We need a rule for 200ml bottles and similar: block them, or allow collection in person only.
- **"Original retail packaging" is a risk for decants and boxless partials.** We need Royal Mail to tell us whether a decant atomiser or a bottle without its box qualifies. **This could affect whether decants can be posted at all.**
- **Drop-off:** if business labels also need a Post Office counter, sellers can't use parcel postboxes. The guidance should tell sellers where to go.
- **Labels:** every label we generate needs the ID8000 mark, and seller guidance needs to cover packing.

## 3. Shipping broker

| | Sendcloud | Packlink PRO | Royal Mail direct |
| --- | --- | --- | --- |
| **Perfume** | Uses each carrier's rules. **Ask** whether perfume is allowed on its Royal Mail contract, with ID8000 | **Lists perfumes as prohibited** (dangerous goods, ADR/LQ) **(confirm)** | Allowed within the limits above |
| **Royal Mail** | Yes, on Sendcloud's rates (published from about £2.22 to £2.38) or your own contract | Listed as a carrier | Yes |
| **API** | Documented REST API v3: shipments and labels, rates, returns, tracking, and webhooks for parcel status ([Sendcloud docs](https://sendcloud.dev/docs/getting-started/), [status webhook](https://sendcloud.dev/api/v3/webhooks/parcel-status-changed)) | Little public documentation; mostly plugins | Click & Drop API, and a Shipping and Tracking API for business accounts **(confirm webhooks)** |
| **Labels from many sellers' addresses** | Sender addresses exist in the API. **Ask** how it works for a marketplace with thousands of sellers | Unknown | **Ask** |
| **Cost** | A subscription (Lite around €25–35 a month) plus a per-label fee of about 5p to 15p, plus postage. Sources disagree, so check the [pricing page](https://www.sendcloud.com/en-uk/pricing/) | Free plugin; pay per label | Postage only. Tracked 24/48 for business needs an account, and Royal Mail mentions a minimum of 1,000 items a year **(confirm)** |
| **Later flexibility** | Many carriers, if we ever sell non-perfume items | Many carriers | Royal Mail only |

### Recommendation
- **Rule out Packlink:** perfume is prohibited and the API is thin.
- **Default to Sendcloud,** if it confirms the answers below. It has the best-documented API and webhooks, and it doesn't need a Royal Mail account or volume commitment on day one.
- **If not, go to Royal Mail direct:** if Sendcloud won't carry perfume on its contract, or adds too much cost per label, use Royal Mail's Click & Drop or Shipping API once we have a business account.

### Questions to send before choosing
1. **To Sendcloud:** Can we send perfume (≤150ml, ID8000) on your Royal Mail Tracked 24/48 contract? Can one account create labels from thousands of different sender addresses (marketplace sellers)? What's the per-label cost at around 500 to 2,000 labels a month?
2. **To Royal Mail business:**
   - Does a decant in an atomiser, or a used bottle without its box, count as "original retail packaging"?
   - Must perfume parcels sent with business labels be handed in at a Post Office counter?
   - What account and volume do we need for Tracked 24/48 through the API?
   - Is there a tracking webhook or push feed?

## Decisions to take with Bilal

1. **Deposits for swaps (instead of holds):**
   - Accept deposits?
   - Set the Swap Protection fee to at least cover the deposit's card fee (≈1.5% + 20p of the swap value), plus the card fees on the fee itself and on any cash top-up.
2. **Revise the delivery decision:**
   - The buyer picks Royal Mail Tracked 24 or 48.
   - Evri and InPost lockers are dropped, since they can't carry perfume.
   - The 48-hour window starts on delivery only.
3. **Bottles over 150ml:** block them from listing, or allow them for collection only?
4. **Decants depend on Royal Mail's packaging answer.** Hold the decant decisions until it comes back.
5. **Broker:** Sendcloud, subject to their answers, otherwise Royal Mail direct.
