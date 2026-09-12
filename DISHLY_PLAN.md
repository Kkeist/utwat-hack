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
- [ ] Judge-style pick copy ("The matter has been settled…") is left as is —
      owner has not decided whether Dishly keeps that voice

## Tech stack

- Web-agent scraping step uses [Steel.dev](https://steel.dev) (cloud
  browsers). The repo already has a Steel client scaffold from the earlier
  "Menu Roulette" workstream (`lib/steel.ts`, `lib/scrape-menu.ts`) that
  covers the text-menu scraping tier and can be reused for Dishly's scrape
  step.
