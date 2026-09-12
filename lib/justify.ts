/**
 * OWNER: Workstream C (game logic + API routes)
 *
 * Deadpan justification, composed from clauses chosen by a seeded PRNG keyed on
 * dish + category + partySize — so the same dish always produces the same text and
 * nothing reshuffles on re-render. (Design doc §6.)
 *
 * NO MODEL. Cost zero, latency zero, failure modes none. This is a deliberate
 * constraint of the project, not a shortcut — do not reach for an LLM here.
 *
 * The register is absolute institutional confidence about what was a coin flip.
 * It never winks at the audience. Never "randomly", never "haha", never an emoji.
 *
 * Clause slots: opener | declaration | course line | the menu's own description
 * recast as understatement | price bracket | party-size line | closing certainty.
 *
 * Target:
 *   "Let the record show the decision was unanimous. You are having the Duck Confit.
 *    It anchors the table. Everything else is commentary. At $31 it occupies the
 *    precise midpoint between prudence and ambition. For a table of 3, this is the
 *    only distribution that survives scrutiny. This conclusion is robust to every
 *    reasonable objection."
 */
import type { Course, Dish } from '@/lib/types';
import { hashSeed, seededRng } from '@/lib/roulette';

export const OPENERS = [
  'Let the record show the decision was unanimous.',
  'The matter has been settled.',
  'Following review, the outcome is not in question.',
  // TODO(C): more. Keep them bureaucratic, never jokey.
];

export const CLOSERS = [
  'This conclusion is robust to every reasonable objection.',
  'No further deliberation is required.',
  'The finding stands.',
  // TODO(C)
];

// TODO(C): COURSE_LINES: Record<Course, string[]>
// TODO(C): priceBracket(priceValue?: number): string  — "At $31 it occupies the
//          precise midpoint between prudence and ambition." Handle undefined
//          (prix-fixe) without an empty clause.
// TODO(C): partyLine(partySize: number): string
// TODO(C): understate(description?: string): string — recast the menu's own words.

/** PLACEHOLDER — opener + declaration + closer only. */
export function justify(dish: Dish, course: Course, partySize: number): string {
  const rng = seededRng(hashSeed(`${dish.name}|${dish.category ?? ''}|${partySize}`));
  const pick = <T,>(xs: T[]): T => xs[Math.floor(rng() * xs.length)];

  return [
    pick(OPENERS),
    `You are having the ${dish.name}.`,
    pick(CLOSERS),
  ].join(' ');
}
