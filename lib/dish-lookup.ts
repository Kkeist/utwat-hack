/**
 * OWNER: Workstream A (Steel plumbing)
 *
 * Dish facts, two sources merged per dish:
 *   - a description sentence and lead photo: Wikipedia via Steel /scrape
 *     (canned fixture when mocked). Wikipedia and not Google because: no bot
 *     detection, the opening sentence is already the right shape, and
 *     `metadata.ogImage` gives us the lead photo for free. (Design doc §5.)
 *   - an ingredient list and a recipe photo: TheMealDB's free search API.
 *     Plain fetch, no browser needed. Used in every mode.
 *
 * Fallback chain, never render empty:
 *   Wikipedia sentence -> the restaurant's own menu description -> name only.
 *
 * The Google search URL is BUILT LOCALLY as a string. Never request it.
 */
import type { Dish, DishFacts } from '@/lib/types';
import { isMocked } from '@/lib/steel';
import { cacheGet, cacheSet } from '@/lib/cache';
import { SAMPLE_FACTS } from '@/lib/fixtures';

export function googleSearchUrl(name: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${name} dish`)}`;
}

/** Cache-first single lookup. */
export async function lookupDish(dish: Dish): Promise<DishFacts> {
  const hit = await cacheGet(dish.name);
  if (hit) return hit;

  const [base, meal] = await Promise.all([
    isMocked() ? (SAMPLE_FACTS[dish.name] ?? fallbackFacts(dish)) : fetchFromWikipedia(dish),
    fetchFromMealDb(dish),
  ]);
  const facts: DishFacts = meal
    ? {
        ...base,
        photoUrl: base.photoUrl ?? meal.photoUrl,
        ingredients: meal.ingredients,
        source: base.source === 'wikipedia' ? 'wikipedia' : 'mealdb',
      }
    : base;

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

const MEALDB_SEARCH = 'https://www.themealdb.com/api/json/v1/1/search.php?s=';
const MEALDB_TIMEOUT_MS = 6000;

/** Lowercase ASCII words: "Crème Brûlée" -> "creme brulee". */
function plainWords(name: string): string[] {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

type MealRecord = Record<string, string | null>;

/**
 * TheMealDB matches by substring, so "Espresso" returns an espresso ice
 * cream. A hit counts only when every word of the dish name is in the meal
 * name and the meal name is at most two words longer — "Pork Cassoulet" for
 * "Cassoulet" passes, a six-word recipe title does not.
 */
async function fetchFromMealDb(dish: Dish): Promise<{ photoUrl?: string; ingredients: string[] } | undefined> {
  const words = plainWords(dish.name);
  if (!words.length) return undefined;
  try {
    const res = await fetch(MEALDB_SEARCH + encodeURIComponent(words.join(' ')), {
      signal: AbortSignal.timeout(MEALDB_TIMEOUT_MS),
    });
    if (!res.ok) return undefined;
    const json = (await res.json()) as { meals: MealRecord[] | null };
    const meal = json.meals?.find((m) => {
      const mealWords = plainWords(m.strMeal ?? '');
      return words.every((w) => mealWords.includes(w)) && mealWords.length <= words.length + 2;
    });
    if (!meal) return undefined;

    // Recipes list an ingredient twice when it is used in two steps, and
    // capitalise inconsistently across recipes ("butter", "Butter"); one
    // spelling, once.
    const ingredients: string[] = [];
    for (let i = 1; i <= 20; i++) {
      const raw = meal[`strIngredient${i}`]?.trim();
      if (!raw) continue;
      const v = raw.charAt(0).toUpperCase() + raw.slice(1);
      if (!ingredients.some((x) => x.toLowerCase() === v.toLowerCase())) ingredients.push(v);
    }
    return { photoUrl: meal.strMealThumb ?? undefined, ingredients };
  } catch {
    return undefined;
  }
}
