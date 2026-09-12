# Dishly

Point it at a restaurant. It reads the menu, decides what you are eating, and
explains why the decision was never in doubt.

Built on [Steel](https://steel.dev) — cloud browsers for the menu scrape and for
dish facts. No LLM anywhere in the stack: the justification text is templated over
facts already scraped, so output is deterministic, costs nothing per call, and
cannot be taken down by a model API having a bad afternoon.

## Run it

```bash
npm install
cp .env.example .env.local   # MOCK_STEEL=1 is enough to start
npm run dev
```

With `MOCK_STEEL=1` the app runs entirely offline against `lib/fixtures` — no Steel
key, no network. Every workstream except the Steel one develops this way.

For the real thing, put a key in `.env.local` and drop `MOCK_STEEL`:

```bash
STEEL_API_KEY=sk-...
```

## Scripts

| | |
| --- | --- |
| `npm run dev` | dev server |
| `npm run probe` | offline parser check against the fixture menu. No Steel calls. Run after any parser change. |
| `npm run warm` | pre-warm the dish cache before judging: `npm run warm -- <url> [url…]` |
| `npm run typecheck` | `tsc --noEmit` |

## Layout

```
lib/types.ts        shared contract — Dish, Pick, DishFacts, API shapes
lib/steel.ts        Steel client (the option is `steelAPIKey`, not `apiKey`)
lib/scrape-menu.ts  two-tier menu fetch: /scrape, then session + Playwright
lib/parse-menu.ts   markdown → Dish[], plus the menuLooksReal gate
lib/dish-lookup.ts  Wikipedia facts, cache-first, parallel batch
lib/cache.ts        normalized-key cache, memory + disk
lib/roulette.ts     course classification + party allocation
lib/justify.ts      deadpan justification, no model
lib/fixtures/       sample menu + expected parse, for offline work
app/api/menu        scrape → parse → spin → justify → enrich picks
app/api/dish        lazy single lookup + background prefetch batch
app/components/     UI
scripts/probe.ts    offline parser check
scripts/warm.ts     pre-warm the cache
```

## Who is doing what

See [WORKPLAN.md](WORKPLAN.md) — four workstreams, no shared files.
