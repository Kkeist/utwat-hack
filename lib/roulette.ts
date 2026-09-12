/**
 * OWNER: Workstream C (game logic + API routes)
 *
 * Uniform random over a whole menu gives a table of four three desserts and a side
 * of bread — funny once, then just broken. (Design doc §7.)
 *
 * Classify each dish, then allocate:
 *   - one main per person
 *   - roughly one shared starter per two people
 *   - one dessert for the table
 * Avoid duplicates while the pool allows it. The RNG is injectable so demos repeat.
 */
import type { ClassifiedDish, Course, Dish, Pick } from '@/lib/types';

export type Rng = () => number;

/** Seeded PRNG (mulberry32). Same seed, same table — demos are reproducible. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cheap string hash, for seeding off a URL + party size. */
export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Category first, name second. EVERY token here must be \b-anchored:
 * an unanchored `tea` files S-tea-k Frites as a beverage. (Design doc §8.)
 */
export function classify(dish: Dish): Course {
  const hay = `${dish.category ?? ''} ${dish.name}`.toLowerCase();
  if (/\b(drinks?|wine|beer|cocktails?|coffee|tea|juice|soda)\b/.test(hay)) return 'drink';
  if (/\b(desserts?|sweets?|pudding|ice cream)\b/.test(hay)) return 'dessert';
  if (/\b(starters?|appetizers?|apps|small plates|antipasti|entradas)\b/.test(hay)) return 'starter';
  if (/\b(mains?|entr[ée]es?|plates?|grill|pasta|from the sea)\b/.test(hay)) return 'main';
  // TODO(C): name-level rules for menus with no useful headings.
  return 'other';
}

export function classifyAll(dishes: Dish[]): ClassifiedDish[] {
  return dishes.map((d) => ({ ...d, course: classify(d) }));
}

/** How many of each course a table of N gets. */
export function allocation(partySize: number): Record<Course, number> {
  return {
    main: partySize,
    starter: Math.max(1, Math.round(partySize / 2)),
    dessert: 1,
    drink: 0,
    other: 0,
  };
}

/**
 * PLACEHOLDER — picks mains only, allows duplicates, ignores the allocation.
 * Workstream C replaces this. `justification` is filled in by the caller so this
 * stays a pure allocation function.
 */
export function spin(dishes: Dish[], partySize: number, rng: Rng = Math.random): Omit<Pick, 'justification'>[] {
  const pool = classifyAll(dishes);
  const mains = pool.filter((d) => d.course === 'main');
  const source = mains.length ? mains : pool;

  return Array.from({ length: partySize }, (_, i) => {
    const dish = source[Math.floor(rng() * source.length)];
    return { dish, course: dish.course, seat: i + 1, shared: false };
  });
}
