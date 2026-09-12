/**
 * OWNER: Workstream B (parsing, cache, scripts)
 *
 * Normalized-key cache, two layers: in-memory for the process, JSON on disk so the
 * cache survives restarts and can be pre-warmed before judging. (Design doc §4.)
 *
 * Swap the disk layer for Vercel KV if we deploy.
 */
import type { DishFacts } from '@/lib/types';

const CACHE_FILE = '.cache/dishes.json';

/**
 * Strip menu-speak so the same dish hits across restaurants.
 *   "Our Famous Caesar Salad (Large) *GF*"  ->  "caesar salad"
 *
 * Every token you add to a strip list MUST be \b-anchored. An unanchored `fri`
 * ate Steak Frites; an unanchored `tea` filed S-tea-k Frites as a beverage.
 * (Design doc §8. This bug class is invisible until a judge orders that dish.)
 */
export function normalizeDishName(name: string): string {
  // TODO(B): strip parentheticals, *GF*/*V*/*DF* markers, leading "our famous",
  // trailing size words, punctuation; collapse whitespace; lowercase; strip accents.
  return name.toLowerCase().trim();
}

const memory = new Map<string, DishFacts>();

export async function cacheGet(name: string): Promise<DishFacts | undefined> {
  const key = normalizeDishName(name);
  // TODO(B): fall through to the disk layer on a memory miss, and populate memory.
  return memory.get(key);
}

export async function cacheSet(name: string, facts: DishFacts): Promise<void> {
  const key = normalizeDishName(name);
  memory.set(key, facts);
  // TODO(B): debounced write-through to CACHE_FILE. Do not write on every call.
}

/** Used by scripts/warm.ts to report what is already warm. */
export async function cacheStats(): Promise<{ memory: number; disk: number; file: string }> {
  // TODO(B): count disk entries.
  return { memory: memory.size, disk: 0, file: CACHE_FILE };
}
