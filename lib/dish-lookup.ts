/**
 * OWNER: Workstream A (Steel plumbing)
 *
 * Dish facts from Wikipedia via Steel /scrape. Wikipedia and not Google because:
 * no bot detection, the opening sentence is already the right shape, and
 * `metadata.ogImage` gives us the lead photo for free. (Design doc §5.)
 *
 * Fallback chain, never render empty:
 *   Wikipedia first sentence -> the restaurant's own menu description -> name + search link.
 *
 * The Google search URL is BUILT LOCALLY as a string. Never request it.
 */
import type { Dish, DishFacts } from '@/lib/types';
import { isMocked } from '@/lib/steel';
import { cacheGet, cacheSet } from '@/lib/cache';

export function googleSearchUrl(name: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${name} dish`)}`;
}

/** Cache-first single lookup. */
export async function lookupDish(dish: Dish): Promise<DishFacts> {
  const hit = await cacheGet(dish.name);
  if (hit) return hit;

  const facts = isMocked() ? fallbackFacts(dish) : await fetchFromWikipedia(dish);
  await cacheSet(dish.name, facts);
  return facts;
}

/** Parallel batch. Used for picks (2-5) and background prefetch (~8). */
export async function lookupDishes(dishes: Dish[]): Promise<Record<string, DishFacts>> {
  const settled = await Promise.allSettled(dishes.map(lookupDish));
  const out: Record<string, DishFacts> = {};
  settled.forEach((r, i) => {
    out[dishes[i].name] = r.status === 'fulfilled' ? r.value : fallbackFacts(dishes[i]);
  });
  return out;
}

/** Tier below Wikipedia. Pure, no network — safe for any caller to use directly. */
export function fallbackFacts(dish: Dish): DishFacts {
  return {
    name: dish.name,
    description: dish.description,
    searchUrl: googleSearchUrl(dish.name),
    source: dish.description ? 'menu' : 'none',
  };
}

async function fetchFromWikipedia(dish: Dish): Promise<DishFacts> {
  // TODO(A): steel().scrape on the Wikipedia article for the normalized name.
  // Take the first sentence of the lead paragraph and metadata.ogImage.
  // A miss (no article / disambiguation page) returns fallbackFacts(dish) — not an error.
  return fallbackFacts(dish);
}
