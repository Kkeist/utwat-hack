# Project index

Dishly: paste a restaurant's website, get its menu back with every dish
explained (what it is, a photo). Hackathon project; the UI workstream lives
on the `ui` branch. Requirements and progress: `DISHLY_PLAN.md`.

## Run

- `start.bat` — dev server on http://localhost:3000 with `MOCK_STEEL=1`
  (no API key needed). Any URL-shaped input returns the sample menu.
- `node scripts/screenshot.mjs screenshots` — phone / tablet / desktop
  screenshots of the entry page, result page, an expanded row, and a
  mid-scroll viewport. Needs the dev server running.
- `npm run typecheck`, `npm run lint`.

## Layout

| Path | What |
| --- | --- |
| `app/page.tsx` | Page shell, client state, fetches `/api/menu` and `/api/dish` |
| `app/layout.tsx` | Fonts (Courgette script, Cormorant Garamond serif), table + wall backgrounds |
| `app/globals.css` | All colour tokens, textures, wordmark, menu-card frame, leaders |
| `app/copy.ts` | Every UI string |
| `app/components/` | UI components (below) |
| `app/api/menu`, `app/api/dish` | API routes (workstream C) |
| `lib/` | Scraping, parsing, lookup, cache, roulette (workstreams A–C) |
| `lib/fixtures/` | Sample menu markdown, expected parse, canned dish facts |
| `public/icons/` | fork.png, knife.png, plate-mark.png (hand-drawn art) |
| `scripts/` | probe, warm, screenshot |

## Reusable components

- `Card` (`app/components/Card.tsx`) — the cream menu card with the double
  rule. Every block on the page is one.
- `SectionTitle` (same file) — script heading between two gold rules.
- `Skeleton` — shimmer placeholder.
- `Header` — the awning; `Hero` + `UrlForm` — entry form; `PickCard` — one
  suggested dish; `MenuList` — grouped menu with expandable rows;
  `Provenance` — colophon line.

## Data flow

URL + party size → `POST /api/menu` → scrape (Steel, or fixture when mocked)
→ parse (or `SAMPLE_DISHES` when mocked) → picks + justification → facts for
picks only → client renders, then prefetches facts for the first 8 other
dishes via `POST /api/dish`; a row click fetches the rest on demand.

## Conventions

- Comments in English. Colours only through tokens in `globals.css`.
- UI text only through `app/copy.ts`.
- Icons as plain `<img>` (next/image caches by path; art is overwritten in place).
- Fixed side walls are verified with viewport screenshots, never fullPage.

## Open

- Real scrape path (`lib/scrape-menu.ts`) is still a stub.
- Judge-style pick copy undecided.
- 5 sample dishes still without Wikipedia facts (rate limit on 2026-09-12).
