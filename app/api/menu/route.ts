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

export const runtime = 'nodejs';
export const maxDuration = 60;

function fail(message: string, status = 400) {
  return NextResponse.json<ApiError>({ error: true, message }, { status });
}

export async function POST(req: Request) {
  const body = MenuRequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail('Give me a restaurant URL and a party size.');

  const { url, partySize } = body.data;

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

    const rng = seededRng(hashSeed(`${url}|${partySize}|${Date.now()}`));
    const picks = spin(dishes, partySize, rng).map((p) => ({
      ...p,
      justification: justify(p.dish, p.course, partySize),
    }));

    // Picked dishes only — typically 2-5 lookups.
    const facts = await lookupDishes(picks.map((p) => p.dish));

    return NextResponse.json<MenuResponse>({
      url,
      source: scraped.source,
      sessionViewerUrl: scraped.sessionViewerUrl,
      dishes,
      picks,
      facts,
    });
  } catch (err) {
    // TODO(C): distinguish a Steel failure from a parse failure in the message.
    return fail(err instanceof Error ? err.message : 'Something went wrong.', 500);
  }
}
