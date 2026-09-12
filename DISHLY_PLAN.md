# Dishly — Menu App Plan

## Why

When a diner doesn't know what a dish on a restaurant's menu actually is, a
web agent looks it up and explains it.

## Core flow

- [ ] User input: a restaurant website link
- [ ] Web agent visits the restaurant site and grabs menu info
  - [ ] Step 1: find a text menu — dish name + price
  - [ ] Step 2: if no text menu, find a picture menu and run OCR
- [ ] Resolve dish info
  - [ ] Step 1: look up the dish on https://www.themealdb.com/
  - [ ] Step 2: if not found there, generate a description with an LLM
- [ ] Output: a food menu where each dish has a description (ingredients,
      cooking method) and a photo

## Add-ons (after core flow works)

- [ ] Search dishes by ingredients they contain
- [ ] Recommend dishes and calculate a combo total (after tax) against a
      given budget
- [ ] Web agent finds the best 5 restaurants in a city and visits each site
      to pull its menu

## Not now

- [ ] Uploading a photo of a physical menu with OCR — deferred, out of scope
      for this pass

## UI (workstream D)

Round of 2026-09-12, evening — full redo after the first pass missed the brief.

- [x] Italian-restaurant, printed-menu feel: cream menu card with a double
      gold rule on a kraft table, deep green linen walls either side
- [x] Script typeface for the wordmark and section headings (Courgette);
      serif (Cormorant Garamond) for everything else; Inter removed
- [x] Wordmark legible on the stripes: tomato script with a cream halo
- [x] Generated textures: paper fibre on the table and card, woven linen on
      the walls — no image assets
- [x] Phone, tablet and desktop checked by screenshot (390 / 820 / 1440)
- [x] Result page: chef's suggestions with photos, then the menu grouped by
      course with dotted price leaders; a dish row opens in place
- [x] One-line instruction under the Restaurant tag; what-Dishly-does note
      under the Search button — English wording is a draft from the Chinese
      brief, to be revised by the owner
- [x] Awning-to-card gap tightened so the form is on screen immediately
- [x] Mock result page shows the full sample menu (courses, descriptions,
      real Wikipedia photos for 11 dishes); the 5 remaining dishes hit a
      Wikipedia rate limit and still fall back to the menu's own text
- [x] Judge-style pick copy dropped from the page (round 2: owner said no AI
      copy for now); the API still returns it, nothing reads it

Round 2, same evening — owner feedback on the redo.

- [x] URL box: lighter field, softer frame, no red focus ring
- [x] Results on their own page (`/menu`) with a Back control to re-enter
- [x] URL field pre-filled with the built-in test address
- [x] Intro / about sentences stay. (Round 2 misread "no AI copy" as these
      two lines and removed them; owner corrected it — the unwanted copy was
      the judge-style suggestion text. Both lines restored.)
- [x] Dish output as: photo, name, ingredient tags, description
- [x] "Look it up" removed — it was a Google search link fallback
- [x] Side walls run the full page height in every capture (were `fixed`;
      now real full-height columns, so long screenshots show them too)
- [x] In-page dish search
- [x] Two views: full (one dish per row with details) and compact (photo +
      name grid, click opens a centred dialog); choice remembered
- [x] TheMealDB used as a test source for ingredients, descriptions, photos
      (7 of the 23 sample dishes match; the rest fall back to Wikipedia
      facts or the menu's own line)

Round 3, same evening.

- [x] Search matches detailed content (name, menu line, course, looked-up
      description, ingredients) — verified, already the case
- [x] Dialog Close pinned in place, does not scroll away
- [x] Phone toolbar: Back + Full/Compact on the first row, search on the second
- [x] "for a table of N" moved into Chef's suggestions
- [x] Collapsed ingredient filter: Include / Exclude, type-to-search with
      chips inside the box, plus a click-to-pick list

Round 4, 2026-09-12 — merged the original repo's workstream-c (parser,
roulette, justify, review-signals), owner said go ahead and connect it into
one flow.

- [x] Reversal of the round-2 call: the judge-style verdict is now shown,
      in the dish detail dialog, under a "The verdict" divider — only for
      dishes that were one of the roulette's picks
- [x] `/api/justify`'s Claude upgrade is now called after every menu load,
      silently replacing the templated verdict when it lands

Round 5, 2026-09-12 — UI/architecture cleanup, prompted by a code review of
workstream D's own work.

- [x] Search and the ingredient filter could show stale or missing matches
      while dish facts are still arriving in the background (a dish's
      ingredients/description are not searchable until their batch lands).
      Fixed: a note appears under "The menu" heading while facts are still
      loading and the user has an active search or filter, so the gap is
      explained instead of looking like a bug. Confirmed with a throttled
      network in Playwright: hidden immediately after typing, shown once
      the 200ms debounce commits while a batch is still in flight, gone
      once the batch lands.
- [x] `DishTile`/`DishCard` wrapped in `React.memo` — a batch of facts
      landing was re-rendering every dish tile on screen, not just the
      ones whose facts had just arrived, because `facts` is a new object
      on every batch. `dish` and already-loaded `facts[name]` keep the
      same object reference across batches (`cacheGet`/the merge in
      `MenuView.enrich` never touch settled entries), so `memo`'s shallow
      compare correctly skips the ones that did not change.
- [x] Search input debounced 200ms: filtering now runs 200ms after typing
      stops rather than on every keystroke. Invisible at 23 dishes; matters
      once a real scraped menu is larger.
- [x] `scripts/check-alignment.mjs` added: measures menu-card padding/left
      edge and shared control heights with `getBoundingClientRect()`
      instead of eyeballing screenshots. Passing on the current build.

## Tech stack

- Web-agent scraping step uses [Steel.dev](https://steel.dev) (cloud
  browsers). The repo already has a Steel client scaffold from the earlier
  "Menu Roulette" workstream (`lib/steel.ts`, `lib/scrape-menu.ts`) that
  covers the text-menu scraping tier and can be reused for Dishly's scrape
  step.
