# 001: Baseline — accounts, listings and browsing

- **Status:** Draft
- **Design:** Bilal's canvas, frames Home, Browse, Listing and Sell (not yet checked against the canvas). Components in the [design system](https://claude.ai/artifact/Stv4CqAUrz5UhFbBL6xVmd).
- **Depends on:** nothing. Every other spec builds on this one.

## Why

Sign-in, seller profiles, listing a fragrance and browsing were built before we wrote specs. This spec records how they work, so later specs and tests have a reference. It also makes the changes from Bilal's decisions on 2026-10-26: batch codes become optional, and so does linking a decant to a source bottle. Linking one becomes a way to earn a "Verified source" badge. The spec also adds the basics a live marketplace is missing: editing and removing a listing, and more browse filters.

## Scope

**In:**
- Email sign-in link, and a seller profile with a display name.
- Listing a full bottle, partial or decant, with photos.
- Registering a source bottle with a video, and optionally linking decants to it.
- Browsing, searching and filtering active listings, and the listing page.
- Editing and removing your own listing (new).

**Out (and where it goes instead):**
- The ID check before listing: 005.
- Choosing from a catalogue instead of typing the house and name: 002.
- Postage: the seller's postage price goes away and the buyer picks a delivery service at checkout (003, 004). Until then, listings keep the seller's postage price.
- The "Open to swaps" toggle and filter: 007.
- Admin review of source bottle videos and receipts: 009 (Bilal's spec in PR #3).

## User stories

### US-1: As anyone, I want to sign in with my email so that I don't need a password

- **AC-1.1:** Given I enter my email on `/login`, when I submit, then I'm told to check that address for a sign-in link.
- **AC-1.2:** When I open the link, then I'm signed in and taken back to the site, and I stay signed in across visits until I sign out.
- **AC-1.3:** Given I'm signed in, when I choose Sign out on my account page, then I'm signed out and taken home.

### US-2: As a new seller, I want a seller profile so that buyers know who they're buying from

- **AC-2.1:** Given I'm signed in without a seller profile, when I open my account, then I'm asked for a display name.
- **AC-2.2:** When I enter a name of 2 to 40 characters, then my profile is created. Anything shorter or longer is refused with a message that says why.
- **AC-2.3:** Given I have no seller profile, when I open `/sell`, then I'm sent to my account to create one first.

### US-3: As a seller, I want to list a fragrance so that buyers can find it

- **AC-3.1:** When I list a fragrance, then I give:
  - the house and name
  - the kind (full bottle, partial or decant)
  - the size in ml, and how full it is for a partial
  - the condition
  - the price and notes
  - at least one photo
  - optionally, a batch code and a proof-of-purchase file
- **AC-3.2:** Given I leave the batch code empty, when I submit, then the listing is created and shows a "No batch code" tag.
- **AC-3.3:** Given I enter a batch code, then the listing shows "Batch <code>".
- **AC-3.4:** Given any rule below is broken, when I submit, then nothing is saved and every problem is listed in plain words above the button.
- **AC-3.5:** When the listing is saved, then I'm taken to its page and it appears in browse straight away.

### US-4: As a decant seller, I want to show where a decant came from so that buyers trust it

- **AC-4.1:** Given I list a decant, then linking it to one of my registered source bottles is optional.
- **AC-4.2:** Given a decant is linked to a bottle whose video has been checked, then the listing shows a "Verified source" badge and a "Where this decant came from" box with the bottle and its batch code.
- **AC-4.3:** Given a decant is linked to a bottle that hasn't been checked yet, then it can go live, and the badge appears once the bottle is approved.
- **AC-4.4:** Given a decant isn't linked, then it has no badge and no source box. It still needs a size of at least 5ml.
- **AC-4.5:** Given a linked bottle, when the decants listed or sold from it would add up to more than its size, then the listing is refused with "Only <n>ml is left to decant from this <size>ml bottle."

### US-5: As a decant seller, I want to register a source bottle so that my decants can earn the badge

- **AC-5.1:** When I register a bottle, then I give the house, name, size, an optional batch code, a video and an optional receipt.
- **AC-5.2:** The form explains what the video must show: the whole bottle, the batch code close up, and a paper note with my username and the date, in one take.
- **AC-5.3:** Given the bottle hasn't been checked yet, then I can still replace its video or details. Once it's approved, I can't.
- **AC-5.4:** My account page lists my bottles with their status: waiting for a check, checked, or not approved with the reason (from 009).

### US-6: As a seller, I want to edit or remove my listing so that it stays accurate (new)

- **AC-6.1:** Given my listing is active, when I edit it, then I can change everything except the kind, and the same rules apply as when listing.
- **AC-6.2:** When I remove my listing, then it disappears from browse and its page says it's no longer available. It stays on my account page as Removed.
- **AC-6.3:** Given my listing is sold, then I can't edit or remove it.

### US-7: As a buyer, I want to browse and search so that I find what I want quickly

- **AC-7.1:** The home page shows the newest active listings first.
- **AC-7.2:** When I search from the header, then I see listings whose house, name or notes match, newest first.
- **AC-7.3:** I can filter by:
  - kind (Everything, Full bottles, Partials, Decants)
  - condition
  - price range
  - certified sellers only (new)

  Filters combine with the search.
- **AC-7.4:** Given nothing matches, then I see "No fragrances match your search." and a way to clear the filters.
- **AC-7.5:** Given the site has no Supabase keys, then browse shows sample listings and says so.

### US-8: As a buyer, I want a listing page with everything I need to decide

- **AC-8.1:** The page shows:
  - the photos
  - the house, name, kind, size and fill
  - the condition, batch code or "No batch code", and notes
  - the "Receipt verified" and "Verified source" badges where they apply
  - the seller card (name, badge and rating)
  - the price panel, with item, postage, Buyer Protection and the total
- **AC-8.2:** Given the listing is sold or removed, then the page says so and shows no buy button.

## Rules

Each rule ends up as a function in `packages/core`, with tests.

- **R-1:** House and name are required.
- **R-2:** Size is a whole number of ml, greater than 0.
- **R-3:** A partial has a fill from 1 to 100%.
- **R-4:** Price is greater than £0.
- **R-5:** At least one photo is required.
- **R-6:** The batch code is optional for every kind. When it's missing, the listing shows "No batch code".
- **R-7:** A decant is at least 5ml (`MIN_DECANT_ML`).
- **R-8:** Linking a decant to a source bottle is optional. When it's linked, the bottle must be the seller's own.
- **R-9:** Decants linked to one bottle, whether listed or sold and not removed, never add up to more than the bottle's size. This is enforced in the database as well as the form.
- **R-10:** "Verified source" shows only when a decant is linked to a bottle with a checked video.
- **R-11:** Only the owner can edit or remove a listing, and only while it isn't sold.

## Data

What changes from today's schema and types:

- **`listings.batch_code`** becomes optional. So does `batchCode` on `Listing`, `ListingInput` and `SourceBottle` in `packages/core`.
- **The decant constraint** no longer requires `source_bottle_id`. It keeps the 5ml minimum.
- **The decant capacity trigger** runs only when a decant is linked to a bottle.
- **`validateListingInput` and `validateDecantListing`** drop the batch-code and source-bottle requirements.

Who can see what stays as `0002_security.sql` sets it. Listing photos and active listings are public. Videos and receipts are private to the owner and admins.

## Screens and states

- **Home / browse:** the listing grid, with an empty state, the sample-data notice, and a filter row (kind pills, plus condition, price and certified-only).
- **Listing page:** as AC-8.1, plus a sold/removed state.
- **Sell form:** the batch code shows as optional. For decants there's an optional "Link a source bottle" choice, with a link to register one.
- **Register bottle:** the form, including the video instructions.
- **Account:** my profile, listings (Active, Sold, Removed, with edit and remove) and bottles (with status).
- **Sign in:** the form, then a "check your email" confirmation.

## Open questions

- [ ] **Q-1:** Can a decant be linked to a bottle that hasn't been checked yet, with the badge appearing later (as AC-4.3 assumes)? Or only to checked bottles?
- [ ] **Q-2:** Should "Verified source" and "Receipt verified" be search filters too, or only badges?
- [ ] **Q-3:** Today a listing goes live as soon as it's saved. Do we want a draft state, so sellers can save and finish later?
