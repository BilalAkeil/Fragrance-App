# 011: Usernames, member profiles and two-way reviews

- **Status:** In review
- **Design:** none yet. Needs frames for Choose your username, the member profile (with and without listings) and the seller's review prompt. Reuses SellerBadge and SellerCard from the [design system](https://claude.ai/artifact/Stv4CqAUrz5UhFbBL6xVmd).
- **Depends on:** 005 (reviews, seller profiles and `/reviews-policy`, in PR #14), 004 (completed orders). 006 and 007 show the username once this is built.

## Why

005 Q-4 was settled as "sellers review buyers too, as on Vinted". 005 couldn't build it, because buyers have no public name or page: only sellers have a display name, and reviews can only be about a seller. So reviews show "Verified purchase" instead of who wrote them, and a seller has nothing to go on about a buyer.

On Vinted everyone is a member with a username, picked at sign-up. The same profile page serves buyers and sellers, reviews show the reviewer's username, and after an order both sides can leave feedback. This spec copies that, within UK law on reviews (the DMCC Act 2024) and on personal data (UK GDPR).

## Scope

**In:**
- A unique public username for every member, chosen at sign-up, replacing the seller display name.
- One public profile page for every member, buyer or seller.
- Reviews show the reviewer's username and which side they were on.
- After an order, the seller can review the buyer once, in the same 4-day window, and the buyer can reply once.
- Showing a buyer's rating to sellers, and splitting a member's reviews by role.
- Updating `/reviews-policy` for two-way reviews.

**Out (and where it goes instead):**
- Profile photos, bios, followers and "last seen", which Vinted also has: a later spec, if wanted.
- Swap reviews: 007 already lets each side review the other. They show usernames once this is built.
- Removing reviews or forcing a username change for breaking the rules: the actions go in 009, the reasons in 008.
- Automatic feedback (Vinted adds a review when nobody leaves one): not copied, see Q-5.

## User stories

### US-1: As a new member, I want to choose my username when I sign up so that others know who they're dealing with

- **AC-1.1:** Given I sign in for the first time, then before anything else I'm asked to choose a username. I can't buy, list, message, swap or review until I have one (Q-1).
- **AC-1.2:** The form says the username is public, shows the rules (R-1, R-2), and suggests not using my real name.
- **AC-1.3:** Given the username is taken, or was used by someone else before (R-3), then I'm told and asked for another. The check ignores case, so `RoseLover` and `roselover` are the same.
- **AC-1.4:** Given I already have a seller profile from before this feature, then on my next sign-in I'm asked to choose a username, with my display name suggested if it fits the rules and is free (Q-2).

### US-2: As a member, I want to change my username

- **AC-2.1:** From my account I can change my username once every 30 days, and not while I have an order or swap in progress, as on Vinted (R-4).
- **AC-2.2:** Given I can't change it yet, then I see why and when I can.
- **AC-2.3:** Links to my profile from before the change still work, and my reviews show the new username.

### US-3: As anyone, I want to see a member's public profile so that I can judge them

- **AC-3.1:** Every member's profile shows:
  - their username
  - the month and year they joined
  - their rating and number of reviews, or "No reviews yet"
  - their reviews, newest first
- **AC-3.2:** Given the member sells, then it also shows their certification badge and active listings, as 005's seller profile does. Given they don't, then there's no listings section and no badge, and nothing says they're "only a buyer".
- **AC-3.3:** The reviews can be filtered: All, From buyers, From sellers. Swap reviews are in All and labelled "After a swap" (Q-4).
- **AC-3.4:** A profile never shows a member's real name, email, address, postcode, phone, ID check details, or what they've bought (R-7).
- **AC-3.5:** Usernames on listings, orders, reviews, messages and swaps link to the profile. 005's seller profile addresses keep working and lead to the same page.

### US-4: As a member, I want reviews to show who wrote them

- **AC-4.1:** Each review shows the reviewer's username (linked to their profile), the date, the stars, the text, a label ("From a buyer", "From a seller" or "After a swap"), and any reply under it.
- **AC-4.2:** This applies to reviews written before this feature too.
- **AC-4.3:** Given the reviewer has deleted their account, then the review stays, shown as by "Former member", without a link (Q-6).

### US-5: As a seller, I want to review the buyer after an order so that other sellers can trust them

- **AC-5.1:** Given my order is completed, or refunded after a dispute, then on the order page and in the completion email (010) I'm asked to rate the buyer from 1 to 5 stars, with optional text (Q-3).
- **AC-5.2:** I can leave one review per order, within 4 days of the order completing or being refunded: the same window as the buyer's (R-5).
- **AC-5.3:** The review is published straight away, whether or not the buyer has reviewed me, as on Vinted. Neither side can see or change the other's review before writing their own (R-6).
- **AC-5.4:** Given the window has passed, or I've already reviewed, then I see my review (if any) instead of the form.

### US-6: As a buyer, I want to reply to a seller's review of me

- **AC-6.1:** I can reply once to a review of me, and the reply shows under it, as sellers already can (005 AC-2.4).

### US-7: As a seller, I want to see a buyer's rating before I deal with them

- **AC-7.1:** On my order page, and on a message thread or swap offer (006, 007), I see the other member's username, rating and number of reviews, linked to their profile.
- **AC-7.2:** A buyer's rating never blocks a sale or a message. It's there to inform, as on Vinted.

### US-8: As anyone, I want to know how two-way reviews work

- **AC-8.1:** `/reviews-policy` is updated to say: both sides of a finished order or swap can review each other, once, within 4 days; each review is labelled with the side it came from; what each rating counts (R-8); that there's no automatic feedback; and that neither side may make their review depend on the other's (R-6).

## Rules

- **R-1:** A username is 3 to 20 characters: letters, numbers, dots, hyphens and underscores, starting with a letter or number. It's unique, ignoring case.
- **R-2:** A username can't be or contain an email address, phone number, web address or social handle, can't contain words on a blocked list (offensive words, and words that pretend to be us, like "admin", "support" or "official"), and can't pretend to be a fragrance house. Admins can make someone change a username that breaks this (009).
- **R-3:** Once given up, a username is never given to someone else, so nobody can pose as a member with an earlier reputation. The member who gave it up can take it back.
- **R-4:** A username can be changed once every 30 days, and not while the member has an order or swap that's paid but not finished.
- **R-5:** On an order, each side reviews the other once: the buyer reviews the seller (005), and the seller reviews the buyer. Both can do so only when the order is completed, or refunded after a dispute, and within `REVIEW_WINDOW_DAYS` (4) of that. Cancelled orders can't be reviewed. In a swap, each side reviews the other once (007).
- **R-6:** UK law on reviews (the DMCC Act 2024 and the CMA's guidance) applies to both sides:
  - only the two people in a finished order or swap can review each other, so every review comes from a real experience
  - every review is published as written, negative ones too, and none is hidden, reordered or edited by us or by the person reviewed
  - nobody may offer anything for a review, and neither side may make their review, or its stars, depend on the other's ("I'll give you 5★ if you give me 5★")
  - we never write reviews on a member's behalf (Q-5)
  - `/reviews-policy` says how all of this works
- **R-7:** A profile shows only what's needed to judge a member: the username, join date, reviews and rating, and, for sellers, the badge and active listings (UK GDPR: data minimisation). A review isn't linked to the listing it was about.
- **R-8:** A member's rating is the average of every review of them, from either side, as on Vinted. Certification (005 R-3) counts only reviews of them as a seller, including swaps, because the badge is a claim about how they sell (Q-4).
- **R-9:** One reply per review, by the person reviewed (005, unchanged).

## Data

- **Members:** every signed-in person gets a member record with their username, when they joined, and when they last changed their username. Everyone can read the username and join date. Only the member can set or change their username, within R-1 to R-4. The seller record keeps the selling details (ID check, payouts) and no longer has its own name: wherever a seller's name was shown, the username is shown instead.
- **Usernames given up:** kept, with whose they were, so R-3 can be checked. Only server code reads and writes them.
- **Reviews:** a review can be about any member, not only a seller. Each review records who wrote it, who it's about, and which side the person reviewed was on (seller or buyer; a swap side counts as a seller). Only the two people in the order can write it (R-5), and the side is set from the order, not by the apps.
- **Ratings:** each member's overall rating and count, and their rating and count as a seller (for certification). Both are public.

## Screens and states

- **Choose your username:** the form, the rules, taken or not allowed, saved. Shown at first sign-in, and to existing sellers with their display name suggested.
- **Account, username section:** current username, change it, and "You can change it again on 30 November" or "Finish your open orders first".
- **Member profile:** a buyer with no reviews, a buyer with reviews, a seller (badge and listings), a seller with no active listings, the three review filters and their empty states. A profile that no longer exists shows "This member has left".
- **Order page (seller's view):** the buyer's username and rating, then the review prompt once the order is completed or refunded, then a thank-you, or the review once written. The buyer's view gains the reply form for the seller's review of them.
- **Completion email (010):** the seller's email gains a "Review the buyer" link, as the buyer's has one for the seller.
- **`/reviews-policy`:** updated (AC-8.1).

## Open questions

Settled on 2026-10-30 with the rule "copy Vinted, and comply with UK law".

- [x] **Q-1:** Is the username chosen at sign-up or at first purchase? **At sign-up** (the first sign-in, since we sign in by email link), as Vinted asks for one when you register. A member is public as soon as they can message, offer or buy, so they need a name before any of those.
- [x] **Q-2:** What happens to existing sellers' display names? **They become the suggested username,** if it fits R-1 and R-2 and is free; otherwise the seller picks one. There's one public name per member, as on Vinted, so the display name goes.
- [x] **Q-3:** Can the seller review the buyer after a refund following a dispute? **Yes,** on the same terms as the buyer (005 AC-2.3). Both had a genuine experience of the order, and DMCC rules out suppressing negative reviews, so neither side's review is blocked because the order went badly.
- [x] **Q-4:** One rating or two? **One rating on the profile,** the average of all reviews, as Vinted shows one, with filters by side. **Certification counts only reviews as a seller,** because Vinted has no badge to copy, and a "Certified seller" badge built partly on buyer reviews could mislead people about how someone sells (UK consumer law on misleading claims).
- [x] **Q-5:** Do we copy Vinted's automatic feedback (a positive review added when nobody leaves one)? **No.** A review nobody wrote isn't a genuine experience, so showing it as a review, or counting it in a rating or towards the badge, risks breaking the DMCC Act's ban on fake reviews. A member who isn't reviewed simply has fewer reviews.
- [x] **Q-6:** What happens to someone's reviews when they delete their account? **Reviews of them go with their profile. Reviews they wrote stay, as by "Former member",** so the other member keeps their genuine rating. The review no longer identifies who wrote it, which meets UK GDPR.
- [x] **Q-7:** Are reviews hidden until both sides have written one? **No.** Vinted publishes each review when it's left. R-6 forbids making a review depend on the other's, and each side can reply once if they disagree.
