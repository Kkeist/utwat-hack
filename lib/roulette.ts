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
 * Course rules. Every token is \b-anchored, without exception. An unanchored
 * `tea` files S-tea-k Frites as a beverage; an unanchored `fri` makes it vanish
 * entirely. (Design doc §8.)
 */
const DRINK = /\b(drinks?|beverages?|wines?|beers?|cocktails?|coffee|espresso|latte|cappuccino|tea|juice|soda|lemonade|cider|spirits?|aperitifs?|digestifs?)\b/;
const DESSERT = /\b(desserts?|sweets?|puddings?|ice cream|sorbets?|gelato|tarts?|cakes?|br[ûu]l[ée]e|tiramisu|profiteroles?|affogato)\b/;
const STARTER = /\b(starters?|appetizers?|apps|small plates?|antipasti|entradas|hors d'oeuvres?|salads?|soups?|oysters?|bruschetta|charcuterie|bread)\b/;
const MAIN = /\b(mains?|entr[ée]es?|plates?|grill|grilled|pasta|risotto|pizza|from the sea|steaks?|ribs?|ribeye|sirloin|brisket|tenderloin|schnitzel|burgers?|cheeseburgers?|hamburgers?|chicken|salmon|cod|bass|octopus|duck|duckling|pork|lamb|beef|curry|confit|cassoulet)\b/;

/**
 * Cooking methods. A drink word inside a preparation is FOOD, not a beverage:
 * "Red Wine Braised Short Rib", "Beer-Battered Cod", "Coffee-Rubbed Ribeye".
 *
 * This is the compound form of the same bug class as `fri` and `tea`. Anchoring
 * the tokens is not enough — \b happily matches a word sitting inside a longer
 * dish name, and because `allocation()` gives drinks zero and `poolFor` filters
 * them out of the main fallback, a misfiled dish becomes UNREACHABLE: never
 * picked, at any party size, with no error. Silently deleting a steakhouse's
 * signature dish is exactly the failure this project keeps rediscovering.
 */
const PREPARATION = /\b(braised|battered|rubbed|glazed|poached|smoked|marinated|infused|crusted|roasted|seared|grilled|fried|cured|steamed|baked|brined|basted|stuffed|sauce|jus|reduction)\b/;

/**
 * Category first, name second — tested SEPARATELY. Testing them as one string
 * lets a name token outrank the heading it sits under, which is how a Caesar
 * Salad listed under Mains ends up filed as a starter.
 *
 * The two haystacks use different precedence on purpose. A heading is a
 * deliberate label, so "Wine & Drinks" is decisive and drinks are tested first.
 * A dish NAME is prose, so food is tested first and `drink` only wins as a last
 * resort — and never when the name describes a preparation.
 */
export function classify(dish: Dish): Course {
  const category = (dish.category ?? '').toLowerCase();
  if (DRINK.test(category)) return 'drink';
  if (DESSERT.test(category)) return 'dessert';
  if (STARTER.test(category)) return 'starter';
  if (MAIN.test(category)) return 'main';

  const name = dish.name.toLowerCase();
  if (DESSERT.test(name)) return 'dessert';
  if (STARTER.test(name)) return 'starter';
  if (MAIN.test(name)) return 'main';
  if (DRINK.test(name) && !PREPARATION.test(name)) return 'drink';

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
 * Which dishes are eligible for a course.
 *
 * Menus with no useful headings classify as `other` wholesale, so unclassified
 * dishes always top up the pool rather than only standing in when the exact
 * course is empty — one lucky heading match should not starve twenty perfectly
 * good dishes. Beyond that the courses differ on purpose: everybody must be fed,
 * so a main falls back to anything edible; a starter or dessert is skipped
 * rather than filled with a steak.
 */
function poolFor(pool: ClassifiedDish[], course: Course): ClassifiedDish[] {
  const eligible = pool.filter((d) => d.course === course || d.course === 'other');
  if (eligible.length) return eligible;

  return course === 'main' ? pool.filter((d) => d.course !== 'drink') : [];
}

/**
 * Draw up to n dishes without replacement. A shared course caps at the number of
 * distinct dishes available rather than padding with repeats — six "shared"
 * starters that are really the same soup three times is a bug, not a table.
 * Mains are per-seat, so they do repeat once the pool runs dry: everyone eats.
 */
function draw(
  pool: ClassifiedDish[],
  n: number,
  rng: Rng,
  used: Set<string>,
  allowRepeats: boolean,
): ClassifiedDish[] {
  const out: ClassifiedDish[] = [];
  let fresh = pool.filter((d) => !used.has(d.name));

  for (let i = 0; i < n; i++) {
    if (!fresh.length) {
      if (!allowRepeats) break; // shared course: cap at what is actually distinct
      fresh = [...pool];
    }
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

  const starters = draw(poolFor(pool, 'starter'), want.starter, rng, used, false);
  const mains = draw(poolFor(pool, 'main'), want.main, rng, used, true);
  const desserts = draw(poolFor(pool, 'dessert'), want.dessert, rng, used, false);

  return [
    ...starters.map((dish) => ({ dish, course: 'starter' as Course, shared: true })),
    ...mains.map((dish, i) => ({ dish, course: 'main' as Course, seat: i + 1, shared: false })),
    ...desserts.map((dish) => ({ dish, course: 'dessert' as Course, shared: true })),
  ];
}
