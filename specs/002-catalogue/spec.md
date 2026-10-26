# 002: Fragrance catalogue

- **Status:** Draft
- **Design:** none yet. It affects the Sell form (house and fragrance pickers) and Browse (house filter). Not yet checked against Bilal's canvas.
- **Depends on:** 001

## Why

Today sellers type the house and name freely, so "Dior Sauvage EDP", "Sauvage Eau de Parfum" and "sauvage" are three different things. That makes search and filters weaker. Swaps also need a value for each item, because the card hold is the catalogue guide price (brief, Swap rules). One shared list of houses, fragrances and sizes, each with a guide price, fixes both problems.

## Scope

**In:**
- A catalogue of houses, fragrances (with their concentration) and common bottle sizes, each size with a guide price.
- Sellers pick the house and fragrance from the catalogue when listing or registering a bottle, and can ask for a missing one to be added.
- Filtering and searching by house.
- Admins can add, edit and merge entries and set guide prices.
- A guide value for any listing, used by swaps (007).

**Out (and where it goes instead):**
- Swap holds themselves: 007.
- Public fragrance pages with reviews or descriptions: later, if at all.
- Price suggestions to sellers based on recent sales: later.

## User stories

### US-1: As a seller, I want to pick my fragrance from a list so that buyers find it

- **AC-1.1:** When I start typing a house on the sell form, then matching houses are suggested. After I pick one, its fragrances are suggested as I type the name.
- **AC-1.2:** Each fragrance shows its concentration (for example Eau de Toilette, Eau de Parfum, Parfum), so I pick the right one.
- **AC-1.3:** Given I pick a fragrance, then the listing shows the catalogue's spelling of the house and name.
- **AC-1.4:** Given my fragrance isn't in the list, when I type it myself, then the listing can still go live, marked as not yet matched. An admin is asked to add it or match it to an existing entry.

### US-2: As a buyer, I want consistent names so that search and filters find everything

- **AC-2.1:** When I search for a fragrance, then I find every listing matched to it, whatever the seller typed.
- **AC-2.2:** When I filter by house, then I see every listing from that house.

### US-3: As an admin, I want to manage the catalogue so that it stays clean

- **AC-3.1:** I can add a house, add a fragrance (house, name, concentration, optional launch year) and add sizes to it, each with a guide price.
- **AC-3.2:** I see a queue of unmatched listings and requests. I can match each one to an existing fragrance or add a new one, and the listing updates.
- **AC-3.3:** I can merge two entries that are the same fragrance. Listings on the old entry move to the kept one.
- **AC-3.4:** Every guide price change records who made it and when.

### US-4: As the platform, I want a guide value for any listing so that swaps can be valued fairly

- **AC-4.1:** Given a full bottle of a catalogue size, then its guide value is that size's guide price.
- **AC-4.2:** Given a partial, then its guide value is the guide price for its size, multiplied by its fill.
- **AC-4.3:** Given a decant, then its guide value is the fragrance's guide price per ml times the decant's ml.
- **AC-4.4:** Given an unmatched listing, or a fragrance with no guide price, then it has no guide value and can't be offered in a swap until one is set.

## Rules

- **R-1:** A fragrance is unique by house, name and concentration.
- **R-2:** Guide prices are integer pence and greater than 0.
- **R-3:** Guide value of a partial = guide price for its size × fill%, rounded to the nearest penny.
- **R-4:** Guide price per ml = the guide price of the fragrance's most common size ÷ that size in ml. A decant's guide value = price per ml × decant ml, rounded to the nearest penny.
- **R-5:** A listing with no guide value can't be part of a swap (007).

## Data

- **Houses:** name and aliases.
- **Fragrances:** house, name, concentration, optional launch year and aliases.
- **Sizes:** fragrance, ml, guide price, when the price was last updated and by whom.
- **On each listing and source bottle:** an optional link to a fragrance. The house and name text stay, for unmatched listings and history.

Everyone can read the catalogue. Only admins can write to it.

## Screens and states

- **Sell form and register-bottle form:** house and fragrance pickers with suggestions, a "Can't find it? Type it in" fallback, and a not-matched notice.
- **Browse:** a house filter.
- **Admin:** a catalogue list with search; add and edit house, fragrance and sizes; the unmatched queue; merge.

## Open questions

- [ ] **Q-1:** Where does the starting catalogue come from? We can't copy another site's database. Options: build it by hand for the top few hundred fragrances, grow it from what sellers list, or license a dataset.
- [ ] **Q-2:** Where do guide prices come from, and how often are they updated? This is brief Q-5a. Options: set by hand, or worked out from recent sales here with a manual starting value.
- [ ] **Q-3:** Do we treat flankers and reformulations (for example vintage versus current batches) as separate fragrances?
- [ ] **Q-4:** Should we fill notes in from the catalogue, or keep them as the seller writes them?
