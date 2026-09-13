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
import { isMocked, steel } from '@/lib/steel';
import { cacheGet, cacheSet, normalizeDishName } from '@/lib/cache';
import { SAMPLE_FACTS } from '@/lib/fixtures';

export function googleSearchUrl(name: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${name} dish`)}`;
}

/** Cache-first single lookup. */
export async function lookupDish(dish: Dish): Promise<DishFacts> {
  const hit = await cacheGet(dish.name);
  const cachedWell =
    hit &&
    (hit.source === 'wikipedia' || hit.source === 'mealdb') &&
    !/\b(surname|given name|may refer to|disambiguation)\b/i.test(hit.description ?? '');
  if (cachedWell) return hit;

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

const WIKI_SUMMARY = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
const WIKI_SEARCH =
  'https://en.wikipedia.org/w/api.php?action=opensearch&limit=1&namespace=0&format=json&search=';
const WIKI_UA = 'Dishly/1.0 (educational restaurant menu app)';
const WIKI_TIMEOUT_MS = 8000;

type WikiSummary = {
  type?: string;
  title?: string;
  extract?: string;
  thumbnail?: { source?: string };
  originalimage?: { source?: string };
};

/** Lowercase ASCII words: "Crème Brûlée" -> "creme brulee". */
function plainWords(name: string): string[] {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/** OpenSearch is fuzzy — "Eggs Norwegian" must not land on the surname Eggen. */
function titleFitsDish(pageTitle: string, dishName: string): boolean {
  const dish = plainWords(dishName);
  const title = plainWords(pageTitle);
  if (!dish.length || !title.length) return false;
  const distinctive = dish.filter((w) => w.length >= 5);
  if (distinctive.length) return distinctive.some((w) => title.includes(w));
  return dish.every((w) => title.includes(w));
}

function wikiTitle(name: string): string {
  return normalizeDishName(name)
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('_');
}

function firstSentence(text: string): string | undefined {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length < 40) return undefined;
  const match = t.match(/^.+?[.!?](?=\s|$)/);
  const sentence = (match?.[0] ?? t).trim();
  return sentence.length >= 40 ? sentence : t;
}

function looksLikeDisambiguation(text: string): boolean {
  return /\bmay refer to\b|\bdisambiguation\b/i.test(text);
}

function photoFromMeta(meta: unknown): string | undefined {
  if (!meta || typeof meta !== 'object') return undefined;
  const m = meta as Record<string, unknown>;
  for (const key of ['ogImage', 'og_image', 'image']) {
    const v = m[key];
    if (typeof v === 'string' && /^https?:\/\//.test(v)) return v;
  }
  return undefined;
}

function firstLeadParagraph(markdown: string): string | undefined {
  const blocks = markdown.replace(/\r\n/g, '\n').split(/\n{2,}/);
  for (const block of blocks) {
    const t = block
      .replace(/^#{1,6}\s+.*$/gm, '')
      .replace(/^\|.+$/gm, '')
      .replace(/!\[[^\]]*]\([^)]+\)/g, '')
      .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
      .replace(/[*_]/g, '')
      .trim();
    if (t.length < 80) continue;
    if (looksLikeDisambiguation(t)) return undefined;
    if (/^(coordinates|this article|from wikipedia)/i.test(t)) continue;
    return t;
  }
}

function factsFromExtract(
  dish: Dish,
  extract: string,
  photoUrl?: string,
): DishFacts | undefined {
  if (looksLikeDisambiguation(extract)) return undefined;
  const description = firstSentence(extract);
  if (!description) return undefined;
  return {
    name: dish.name,
    description,
    photoUrl,
    searchUrl: googleSearchUrl(dish.name),
    source: 'wikipedia',
  };
}

async function wikiSummary(title: string): Promise<WikiSummary | undefined> {
  const res = await fetch(WIKI_SUMMARY + encodeURIComponent(title.replace(/ /g, '_')), {
    headers: { 'User-Agent': WIKI_UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(WIKI_TIMEOUT_MS),
  });
  if (!res.ok) return undefined;
  return (await res.json()) as WikiSummary;
}

async function wikiSearchTitle(query: string): Promise<string | undefined> {
  const res = await fetch(WIKI_SEARCH + encodeURIComponent(query), {
    headers: { 'User-Agent': WIKI_UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(WIKI_TIMEOUT_MS),
  });
  if (!res.ok) return undefined;
  const json = (await res.json()) as [string, string[]];
  return json[1]?.[0];
}

async function fetchWikiRest(dish: Dish): Promise<DishFacts | undefined> {
  const titles = [wikiTitle(dish.name), dish.name.trim()].filter(Boolean);
  const seen = new Set<string>();
  for (const title of titles) {
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const json = await wikiSummary(title);
    if (!json || json.type === 'disambiguation') continue;
    if (!titleFitsDish(json.title ?? title, dish.name)) continue;
    const hit = factsFromExtract(
      dish,
      json.extract ?? '',
      json.originalimage?.source ?? json.thumbnail?.source,
    );
    if (hit) return hit;
  }

  const searched = await wikiSearchTitle(dish.name);
  if (!searched || seen.has(searched.toLowerCase())) return undefined;
  const json = await wikiSummary(searched);
  if (!json || json.type === 'disambiguation') return undefined;
  if (!titleFitsDish(json.title ?? searched, dish.name)) return undefined;
  return factsFromExtract(
    dish,
    json.extract ?? '',
    json.originalimage?.source ?? json.thumbnail?.source,
  );
}

/** Steel /scrape of the article — the path the workplan names. Used when REST misses. */
async function scrapeWikipedia(dish: Dish): Promise<DishFacts | undefined> {
  const title = wikiTitle(dish.name);
  if (!title) return undefined;
  try {
    const result = await steel().scrape({
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
      format: ['markdown'],
    });
    const markdown = result.content.markdown ?? '';
    if (looksLikeDisambiguation(markdown)) return undefined;
    const lead = firstLeadParagraph(markdown);
    if (!lead) return undefined;
    return factsFromExtract(dish, lead, photoFromMeta(result.metadata));
  } catch {
    return undefined;
  }
}

async function fetchFromWikipedia(dish: Dish): Promise<DishFacts> {
  if (/^[*_]|^(with|and)\b/i.test(dish.name.trim())) return fallbackFacts(dish);
  try {
    const rest = await fetchWikiRest(dish);
    if (rest) return rest;
    return fallbackFacts(dish);
  } catch {
    const scraped = await scrapeWikipedia(dish);
    if (scraped) return scraped;
    return fallbackFacts(dish);
  }
}

const MEALDB_SEARCH = 'https://www.themealdb.com/api/json/v1/1/search.php?s=';
const MEALDB_TIMEOUT_MS = 6000;

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
