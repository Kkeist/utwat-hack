# Dishly — UI/UX portfolio deploy

Dishly is a menu app built for the UTWAT Hackathon by team **404 Brain Not
Found**: paste a restaurant's website, get its menu back with a suggested
table order and every dish explained.

This branch is a standalone deploy of the **UI/UX** contribution only (my
part of the team project). It is not the full product: there is no backend,
no scraping, and no API calls. Every result on screen comes from one fixed
example menu baked into the build (`lib/fixtures/demo-response.ts`), so the
page works from a plain static file host.

The full team project, with the real Steel-based scraping and lookup
pipeline, lives on the `ui` branch of this repository.

## Run it

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

`next.config.ts` sets `output: 'export'`, so this produces a static site in
`out/` — no server, no environment variables, nothing to configure.

## Deploy (Cloudflare Pages)

- Build command: `npm run build`
- Build output directory: `out`
- No environment variables needed.

## Regenerating the example data

`lib/fixtures/demo-response.ts` is generated, not hand-written:

```bash
npm run build-demo-fixture
```

It runs the same pick/justification logic the full app uses
(`lib/roulette.ts`, `lib/justify.ts`) once, over the sample menu in
`lib/fixtures/`, and writes the result to a static file.

## Layout

```
lib/types.ts               shared types — Dish, Pick, DishFacts, MenuResponse
lib/roulette.ts             course classification + party allocation
lib/justify.ts               deadpan justification text, no model
lib/fixtures/                sample menu + the generated demo response
scripts/build-demo-fixture.ts   regenerates lib/fixtures/demo-response.ts
app/components/               UI
```
