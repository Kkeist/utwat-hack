# Project index

Dishly: paste a restaurant's website, get its menu back with every dish
explained (what it is, a photo). Hackathon project; the UI workstream lives
on the `ui` branch. Requirements and progress: `DISHLY_PLAN.md`.

## Run

- `start.bat` — dev server on http://localhost:3000 with `MOCK_STEEL=1`
  (no API key needed). Any URL-shaped input returns the sample menu.
- `node scripts/screenshot.mjs screenshots` — phone / tablet / desktop
  screenshots of the entry page, both result views, the dish dialog, a
  search, and a mid-scroll viewport. Needs the dev server running.
- `npm run typecheck`, `npm run lint`.

## Layout

| Path | What |
| --- | --- |
| `app/page.tsx` | Entry page; submitting goes to `/menu?url=…&party=…` |
| `app/menu/page.tsx` | Result page route (Suspense around `MenuView`) |
| `app/layout.tsx` | Fonts (Courgette script, Cormorant Garamond serif), table + wall backgrounds |
| `app/globals.css` | All colour tokens, textures, wordmark, menu-card frame, leaders |
| `app/copy.ts` | Every UI string |
| `app/components/` | UI components (below) |
| `app/api/menu`, `app/api/dish`, `app/api/justify` | API routes (workstream C) |
| `lib/` | Scraping, parsing, lookup, cache, roulette, justify, review-signals (workstreams A–C) |
| `lib/fixtures/` | Sample menu markdown, expected parse, canned dish facts |
| `public/icons/` | fork.png, knife.png, plate-mark.png (hand-drawn art), app-icon.png (icon source) |
| `public/*.png`, `site.webmanifest`, `browserconfig.xml` | Generated icon set, see `tools/build-icons.py` |
| `scripts/` | probe, warm, screenshot |

## Reusable components

- `Card` (`app/components/Card.tsx`) — the cream menu card with the double
  rule. Every block on the page is one.
- `SectionTitle` (same file) — script heading between two gold rules.
- `Skeleton` — shimmer placeholder.
- `controls.tsx` — `ButtonLink`, `ToggleGroup`, `SearchField`: one outlined
  control style for the whole app.
- `DishDetail.tsx` — `DishDetail` (photo, name, price, ingredient tags,
  description; `layout` row or stack), `DishCard` (full view), `DishTile`
  (compact view).
- `IngredientFilter` — collapsed Include / Exclude filter: chips inside the
  box, type-to-narrow, click-to-pick list.
- `Modal` — centred dialog, pinned Close, locks background scroll, Escape closes.
- `MenuView` — the result page: fetch, batch prefetch, search filter,
  view choice (remembered in localStorage), dialog state.
- `MenuList` / `DishGrid` — grouped by course, in either view.
- `Header` — the awning; `Hero` + `UrlForm` — entry form;
  `Provenance` — colophon line.

## Data flow

URL + party size → `/menu` → `POST /api/menu` → scrape (Steel, or fixture
when mocked) → parse (or `SAMPLE_DISHES` when mocked) → picks → facts for
picks → client renders, then fetches facts for every other dish via
`POST /api/dish` in batches of 12. Facts per dish merge two sources:
Wikipedia sentence + photo (fixture when mocked) and TheMealDB ingredients
+ recipe photo (live, free API, name match must be tight). Search and the
two views are client-side over the loaded list.

## Conventions

- Comments in English. Colours only through tokens in `globals.css`.
- UI text only through `app/copy.ts`.
- Icons as plain `<img>` (next/image caches by path; art is overwritten in place).
- Side walls are full-height absolute columns, so fullPage screenshots show them.

## Open

- Real scrape path (`lib/scrape-menu.ts`) is still a stub.
- Judge-style pick copy is returned by the API but not shown (owner's
  round-2 call). `POST /api/justify` can upgrade it via Claude but nothing
  on the client calls that route.
- Review signals (`lib/review-signals.ts`) score real review text when
  workstream B's scrape lands; mocked runs use `lib/fixtures/sample-signals.ts`.
  Nothing calls `lib/review-signals-llm.ts`'s Claude-backed scorer yet.
- 5 sample dishes still without Wikipedia facts (rate limit on 2026-09-12).
