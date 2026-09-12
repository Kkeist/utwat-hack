# Dishly — four-way split

The skeleton walks today: `MOCK_STEEL=1` runs the whole app end to end against a
fixture menu, with no Steel key and no network. Every workstream below replaces
placeholder bodies inside its own files. **No two workstreams own the same file.**

## Ground rules

1. `lib/types.ts` is the shared contract. If you need a field added, say so in chat
   before you edit it — everyone else compiles against that file.
2. Everyone except **A** works with `MOCK_STEEL=1` in `.env.local`. Only A needs a key.
3. `npm run typecheck` before you push. `npm run probe` after any parser change.
4. Placeholders are marked `PLACEHOLDER` and `TODO(x)`. Grep for your letter.

---

## A — Steel plumbing

**Owns** `lib/steel.ts` · `lib/scrape-menu.ts` · `lib/dish-lookup.ts`
**Needs** the Steel API key. You are the only one who does.

The sponsor surface. Two modes, and the second one is the demo moment.

- Tier 1: `/scrape` for the menu — one HTTP call, no session lifecycle, ~1–2s.
- `scrapeLooksThin()` — the heuristic that decides tier 1 was not good enough.
- Tier 2: session + `playwright-core` over CDP for menus behind tabs, accordions
  and lazy-loaded JS. Return `sessionViewerUrl` — that is what the audience watches.
- Wikipedia lookup: first sentence of the lead paragraph, plus `metadata.ogImage`
  for the photo. A miss returns `fallbackFacts()`, never an error.

**Non-negotiable:** every session released in a `finally`; 120s cap on creation
(`SESSION_TIMEOUT_MS`); the key never imported from a client component. The
constructor option is `steelAPIKey`, **not** `apiKey` — wrong one fails as a 401
at request time, not at construction.

**Done when** a real restaurant URL returns markdown containing prices; a JS-heavy
one returns `source: 'playwright'` with a live viewer URL; and
`lookupDish({name:'Ratatouille'})` returns a Wikipedia sentence and a photo.

---

## B — Parser, cache, scripts

**Owns** `lib/parse-menu.ts` · `lib/cache.ts` · `scripts/probe.ts` · `scripts/warm.ts` · `lib/fixtures/*`
**Needs** nothing. No key, no network, no waiting on anyone.

The actual hard part. There is no standard markup for restaurant menus. Handle:
markdown headings as categories; `**Name** $12`; `Name — description — $12`;
markdown tables (detect the header row by its alignment separator); a description
line following a priced line; priceless prix-fixe items.

Tune for **precision, not recall** — 20 real dishes beats 60 rows where a third are
nav links and opening hours. `menuLooksReal()` is the gate that turns a bad parse
into an honest error instead of a convincing-looking wrong answer.

`normalizeDishName()` is what makes the cache pay: `"Our Famous Caesar Salad
(Large) *GF*"` → `caesar salad`, so hits accumulate across restaurants. Then the
disk layer, so the cache survives restarts and can be pre-warmed before judging.

**Anchor every token in every regex with `\b`.** An unanchored `fri` ate Steak
Frites. An unanchored `tea` filed S-*tea*-k Frites as a beverage. This bug class is
invisible until a judge orders the one dish that vanished.

**Done when** `npm run probe` exits 0 — 23/23 on the fixture, no extras — and two
or three real-menu fixtures you add also pass.

*Right now it finds 16 of 23: the whole markdown table and the two plain-text lines
are missing. That is your starting point.*

---

## C — Roulette, justification, routes

**Owns** `lib/roulette.ts` · `lib/justify.ts` · `app/api/menu/route.ts` · `app/api/dish/route.ts`
**Needs** `MOCK_STEEL=1`.

The joke lives here, and the joke is the register: absolute institutional
confidence about what was a coin flip. It never winks at the audience.

- `classify()` into `starter | main | dessert | drink | other`, category first,
  name second, every token `\b`-anchored.
- Allocate: one main per person, ~one shared starter per two people, one dessert
  for the table. Avoid duplicates while the pool allows it. RNG stays injectable.
- `justify()`: seven clause slots — opener, declaration, course line, the menu's own
  description recast as understatement, price bracket, party-size line, closing
  certainty. Seeded on `dish + category + partySize` so text never reshuffles on
  re-render. **No model.** That is a project constraint, not a shortcut.
- Routes: orchestration only. Enrich **picked dishes only** — never the whole menu.

**Done when** a party of 4 yields 4 mains, 2 starters and 1 dessert with no repeats;
the same dish produces the same paragraph on every reload; and no two picks in one
spin share a sentence.

*Right now `spin()` returns mains only, with duplicates, and `justify()` uses three
of the seven slots.*

---

## D — UI

**Owns** `app/page.tsx` · `app/components/*` · `app/globals.css` · `app/layout.tsx`
**Needs** `MOCK_STEEL=1`.

Dark, serif, restaurant-menu register. Two decisions are load-bearing:

- **Nothing blocks on enrichment.** Name, price and justification render from data
  already in hand; photo and Wikipedia line fade in behind shimmer skeletons. A
  spinner over the whole card makes a 1.5s lookup feel broken.
- **Provenance is visible.** The footer shows dish count and which Steel path ran —
  useful while debugging, and it quietly shows judges the two-tier strategy.

To build: the search box, grouping the menu by category, the skeleton→content fade,
error states that read as deadpan rather than as a stack trace, the session-viewer
link when the Playwright path ran, and a layout that survives a phone.

**Done when** picks are on screen before any fact lands, a clicked dish never shows
an empty card, and the footer is right on both paths.

---

## Sequencing

`B`, `C` and `D` are unblocked right now and never block each other. `A` is the only
one on the critical path for a live demo.

Tier 1 of A is roughly thirty lines — land it first, then A is free to help. The
honest risk is that **B is the hard problem, not A**: if the parser is weak, the demo
fails on an audience URL no matter how good the Steel path is. If someone finishes
early, they go to B.

Merge whenever green. Nobody waits for a big-bang integration — the skeleton already
integrates.

---

## Note: pivoting to Dishly

This workplan describes the "Menu Roulette" direction. The project is now
pivoting toward **Dishly**, an informational menu app — see
[DISHLY_PLAN.md](DISHLY_PLAN.md). The Steel scraping tier (workstream A)
carries over. Workstream C's picking logic (`lib/roulette.ts`) carries over
too — it powers Dishly's "Chef's suggestions" — merged from upstream's
`workstream-c` on 2026-09-12. Its judge-style justification text is
generated and returned by the API but intentionally not shown on the page
(owner's round-2 call, see DISHLY_PLAN.md).
