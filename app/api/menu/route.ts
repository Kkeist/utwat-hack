/**
 * OWNER: Workstream C (game logic + API routes)
 *
 * POST /api/menu  { url, partySize }  ->  MenuResponse
 *
 * Orchestration only — the thinking lives in lib/. Order matters:
 *   scrape -> parse -> gate -> spin -> justify -> enrich PICKED dishes only.
 *
 * Never enrich the whole menu here. A 60-dish menu at ~1.5s each is a dead demo.
 * (Design doc §4.) The unpicked dishes are prefetched by the client, in the
 * background, via /api/dish.
 *
 * The Steel API key is read here and only here-adjacent (lib/steel). It must never
 * reach the client bundle.
 */
import { NextResponse } from 'next/server';
import { MenuRequestSchema, type ApiError, type MenuResponse } from '@/lib/types';
import { scrapeMenu } from '@/lib/scrape-menu';
import { menuLooksReal, parseMenu } from '@/lib/parse-menu';
import { hashSeed, seededRng, spin } from '@/lib/roulette';
import { justify } from '@/lib/justify';
import { lookupDishes } from '@/lib/dish-lookup';
import { isMocked } from '@/lib/steel';
import { SAMPLE_SIGNALS } from '@/lib/fixtures/sample-signals';

export const runtime = 'nodejs';
/** Matches the batch ceiling /api/dish enforces via DishRequestSchema. */
const MAX_PICK_LOOKUPS = 12;
export const maxDuration = 60;

function fail(message: string, status = 400) {
  return NextResponse.json<ApiError>({ error: true, message }, { status });
}

export async function POST(req: Request) {
  const body = MenuRequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail('Give me a restaurant URL and a party size.');

  const { url, partySize, seed: pinnedSeed } = body.data;

  try {
    const scraped = await scrapeMenu(url);
    const dishes = parseMenu(scraped.markdown);

    if (!menuLooksReal(dishes)) {
      // Honest error beats a convincing-looking wrong answer. (Design doc §8.)
      return fail(
        "I could not find a menu on that page. Try linking the menu page directly.",
        422,
      );
    }

    // A fresh table each spin, but the seed is returned so any result can be
    // replayed exactly — mixing Date.now() straight into the RNG made the
    // injectable-RNG design unusable from outside.
    const seed = pinnedSeed ?? hashSeed(`${url}|${partySize}|${Date.now()}`);
    const rng = seededRng(seed);

    // TODO(C): swap for workstream B's real scoring once the review scrape lands.
    // An empty map is a valid input — a restaurant with no reviews spins uniformly.
    const signals = isMocked() ? SAMPLE_SIGNALS : {};
    const picks = spin(dishes, partySize, rng, signals).map((p) => ({
      ...p,
      justification: justify(p.dish, p.course, partySize, signals[p.dish.name]),
    }));

    // Picked dishes only, deduped and capped. A party of 12 allocates 19 picks;
    // enriching them raw would fire 19 concurrent lookups — over this app's own
    // batch ceiling, and a slow demo once these are real Steel calls.
    const toEnrich = [...new Map(picks.map((p) => [p.dish.name, p.dish])).values()].slice(
      0,
      MAX_PICK_LOOKUPS,
    );
    const facts = await lookupDishes(toEnrich);

    return NextResponse.json<MenuResponse>({
      url,
      seed,
      source: scraped.source,
      restaurantName: scraped.restaurantName,
      sessionViewerUrl: scraped.sessionViewerUrl,
      dishes,
      partySize,
      picks,
      signals,
      facts,
    });
  } catch (err) {
    // TODO(C): distinguish a Steel failure from a parse failure in the message.
    return fail(err instanceof Error ? err.message : 'Something went wrong.', 500);
  }
}
