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
 * Ordered course rules. Applied to the menu's category heading first, then — only
 * if the heading said nothing — to the dish name.
 *
 * EVERY token is \b-anchored, without exception. An unanchored `tea` files
 * S-tea-k Frites as a beverage; an unanchored `fri` makes it vanish entirely.
 * (Design doc §8.) Order matters: `drink` runs before `dessert` so an ice-cream
 * float lands in the right bucket, and `dessert` before `main` so a chocolate
 * tart is not read as a plate.
 */
const RULES: [Course, RegExp][] = [
  ['drink', /\b(drinks?|beverages?|wines?|beers?|cocktails?|coffee|espresso|latte|cappuccino|tea|juice|soda|lemonade|cider|spirits?|aperitifs?|digestifs?)\b/],
  ['dessert', /\b(desserts?|sweets?|puddings?|ice cream|sorbets?|gelato|tarts?|cakes?|br[ûu]l[ée]e|tiramisu|profiteroles?|affogato)\b/],
  ['starter', /\b(starters?|appetizers?|apps|small plates?|antipasti|entradas|hors d'oeuvres?|salads?|soups?|oysters?|bruschetta|charcuterie)\b/],
  ['main', /\b(mains?|entr[ée]es?|plates?|grill|pasta|risotto|pizza|from the sea|steaks?|burgers?|chicken|salmon|duck|pork|lamb|beef|curry|confit|cassoulet)\b/],
];

function match(haystack: string): Course | undefined {
  for (const [course, re] of RULES) if (re.test(haystack)) return course;
  return undefined;
}

/**
 * Category first, name second — and the two are tested SEPARATELY. Testing them
 * as one string lets a name token outrank the heading it sits under, which is how
 * a Caesar Salad listed under Mains ends up filed as a starter.
 */
export function classify(dish: Dish): Course {
  return (
    match((dish.category ?? '').toLowerCase()) ??
    match(dish.name.toLowerCase()) ??
    'other'
  );
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
 * Which dishes are eligible for a course.
 *
 * Menus with no useful headings classify as `other` wholesale, so `other` is the
 * first fallback everywhere. Beyond that the two courses differ on purpose:
 * everybody must be fed, so a main falls back to anything edible; a starter or a
 * dessert is simply skipped rather than filled with a steak.
 */
function poolFor(pool: ClassifiedDish[], course: Course): ClassifiedDish[] {
  const exact = pool.filter((d) => d.course === course);
  if (exact.length) return exact;

  const other = pool.filter((d) => d.course === 'other');
  if (other.length) return other;

  return course === 'main' ? pool.filter((d) => d.course !== 'drink') : [];
}

/** Draw n dishes without replacement, falling back to repeats only once the pool runs dry. */
function draw(pool: ClassifiedDish[], n: number, rng: Rng, used: Set<string>): ClassifiedDish[] {
  const out: ClassifiedDish[] = [];
  let fresh = pool.filter((d) => !used.has(d.name));

  for (let i = 0; i < n; i++) {
    if (!fresh.length) fresh = [...pool]; // pool exhausted — repeats are now allowed
    if (!fresh.length) break; // the course does not exist on this menu
    const [dish] = fresh.splice(Math.floor(rng() * fresh.length), 1);
    used.add(dish.name);
    out.push(dish);
  }
  return out;
}

/**
 * Allocate a table. Returns picks in meal order — starters, then mains by seat,
 * then the dessert — so the UI can render them straight down the page.
 *
 * `justification` is filled in by the caller, which keeps this a pure function of
 * (dishes, partySize, rng) and makes it trivial to test.
 */
export function spin(
  dishes: Dish[],
  partySize: number,
  rng: Rng = Math.random,
): Omit<Pick, 'justification'>[] {
  const pool = classifyAll(dishes);
  const want = allocation(partySize);
  const used = new Set<string>();

  const starters = draw(poolFor(pool, 'starter'), want.starter, rng, used);
  const mains = draw(poolFor(pool, 'main'), want.main, rng, used);
  const desserts = draw(poolFor(pool, 'dessert'), want.dessert, rng, used);

  return [
    ...starters.map((dish) => ({ dish, course: 'starter' as Course, shared: true })),
    ...mains.map((dish, i) => ({ dish, course: 'main' as Course, seat: i + 1, shared: false })),
    ...desserts.map((dish) => ({ dish, course: 'dessert' as Course, shared: true })),
  ];
}
