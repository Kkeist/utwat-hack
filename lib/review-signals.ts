/**
 * OWNER: Workstream B
 *
 * Matches dish names against review text and scores sentiment around each
 * mention. No model — deterministic lexicon-based scoring via `sentiment`.
 *
 * SCORING IS PER CLAUSE, NOT PER REVIEW OR PER WINDOW. A glowing review
 * routinely pans one dish, and a fixed character window around a mention spans
 * the very conjunction that flips the sentiment:
 *
 *   "The duck confit was incredible, best I've had, but honestly the
 *    Ratatouille was bland and disappointing."
 *
 * A +/-60 character window around "Ratatouille" swallows "incredible, best I've
 * had" and scores the ratatouille POSITIVE. Splitting on contrastive
 * conjunctions is what makes this correct, and it is why `but` earns its own
 * entry in the split pattern: those words exist precisely to mark the point
 * where sentiment turns.
 *
 * Public API is unchanged — buildDishSignals / rankMenu / buildRankedMenu all
 * keep their signatures. Only the numbers they return are now right.
 */
import Sentiment from 'sentiment';
import { normalizeDishName } from './cache';
import type { Dish } from './types';

const sentiment = new Sentiment();

export type DishSignal = {
  dishName: string;
  mentionCount: number;
  avgSentiment: number;
  score: number;
};

/**
 * AFINN is a general-purpose lexicon and contains none of the vocabulary people
 * actually use about food. Two unambiguously damning reviews — "bland",
 * "watery and underseasoned, would skip it" — scored exactly 0 without this.
 * Range matches AFINN's own -5..+5.
 */
const FOOD_LEXICON: Record<string, number> = {
  bland: -3, watery: -2, underseasoned: -3, unseasoned: -3, soggy: -3,
  greasy: -2, oily: -2, mushy: -2, rubbery: -3, chewy: -1, tough: -2,
  overcooked: -3, undercooked: -3, burnt: -3, dry: -2, lukewarm: -2,
  stale: -3, flavourless: -3, flavorless: -3, tasteless: -3, inedible: -5,
  skip: -2, forgettable: -2, overpriced: -2, gristly: -3, congealed: -3,
  tender: 2, succulent: 3, crispy: 2, flavourful: 3, flavorful: 3,
  moist: 1, silky: 2, velvety: 2, hearty: 2, generous: 1, sublime: 4,
  faultless: 3, moreish: 3, unctuous: 2,
};

/**
 * Sentence ends, and the contrastive conjunctions that flip sentiment mid-sentence.
 * Every token \b-anchored — an unanchored `but` would split "butter".
 */
const CLAUSE_SPLIT =
  /(?<=[.!?;])\s+|\s*[,;]?\s+(?=\b(?:but|however|although|though|whereas|otherwise|that said|other than|apart from)\b)/i;

/**
 * A dish name has to be distinctive enough to survive contact with prose.
 * "Sole" matches "the sole reason we went back"; "Sole Meunière" does not.
 * Precision over recall, same as the menu parser.
 */
function isMatchable(normalized: string): boolean {
  return normalized.includes(' ') || normalized.length >= 5;
}

/** Split a review into independently-scoreable clauses. */
export function splitClauses(reviewText: string): string[] {
  return reviewText
    .split(CLAUSE_SPLIT)
    .map((c) => c.trim())
    .filter(Boolean);
}

/**
 * Which dish names appear in this text. Matching happens entirely in normalized
 * space and returns names only — no character offsets cross between the
 * normalized and original strings, which is what made the old window slicing
 * read the wrong part of the review.
 */
export function findDishMentions(reviewText: string, dishNames: string[]): string[] {
  const haystack = normalizeDishName(reviewText);
  if (!haystack) return [];

  return dishNames.filter((dish) => {
    const needle = normalizeDishName(dish);
    if (!needle || !isMatchable(needle)) return false;
    // Doubled backslashes: inside a template literal a single \b is a
    // BACKSPACE character, not a word boundary, and '\s+' collapses to 's+'.
    return new RegExp(`\\b${needle.replace(/\s+/g, '\\s+')}\\b`, 'i').test(haystack);
  });
}

/**
 * Sentiment of the clause that names this dish, scored on the ORIGINAL text so
 * the lexicon sees real words. Returns 0 when the dish is not mentioned.
 */
export function scoreDishMention(reviewText: string, dishName: string): number {
  const clauses = splitClauses(reviewText).filter(
    (c) => findDishMentions(c, [dishName]).length > 0,
  );
  if (!clauses.length) return 0;

  const total = clauses.reduce(
    (sum, c) => sum + sentiment.analyze(c, { extras: FOOD_LEXICON }).score,
    0,
  );
  return total / clauses.length;
}

function computeScore(mentionCount: number, avgSentiment: number): number {
  const confidence = Math.log2(mentionCount + 1);
  return avgSentiment * confidence;
}

/**
 * Aggregate per dish across every clause of every review.
 *
 * `mentionCount` counts CLAUSES, not reviews — a review praising a dish twice
 * is two pieces of evidence, and this is what lib/types.ts documents.
 *
 * A clause naming two or more dishes is discarded: "the duck was better than
 * the lamb" cannot be apportioned without real parsing, and guessing produces a
 * confidently wrong recommendation. Dropping it costs a little signal; there
 * are plenty of clean clauses.
 */
export function buildDishSignals(reviews: string[], dishNames: string[]): DishSignal[] {
  const totals = new Map<string, { total: number; count: number }>();

  for (const review of reviews) {
    for (const clause of splitClauses(review)) {
      const mentioned = findDishMentions(clause, dishNames);
      if (mentioned.length !== 1) continue;

      const dish = mentioned[0];
      const score = sentiment.analyze(clause, { extras: FOOD_LEXICON }).score;
      const existing = totals.get(dish) ?? { total: 0, count: 0 };
      totals.set(dish, { total: existing.total + score, count: existing.count + 1 });
    }
  }

  return Array.from(totals.entries()).map(([dishName, { total, count }]) => ({
    dishName,
    mentionCount: count,
    avgSentiment: total / count,
    score: computeScore(count, total / count),
  }));
}

/** Split a menu into dishes with review signal vs. dishes with none. */
export function rankMenu(dishes: Dish[], reviews: string[]) {
  const signals = buildDishSignals(reviews, dishes.map((d) => d.name));
  const signalMap = new Map(signals.map((s) => [normalizeDishName(s.dishName), s]));

  const ranked: DishSignal[] = [];
  const unranked: Dish[] = [];

  for (const dish of dishes) {
    const signal = signalMap.get(normalizeDishName(dish.name));
    if (signal) ranked.push(signal);
    else unranked.push(dish);
  }

  ranked.sort((a, b) => b.score - a.score);
  return { ranked, unranked };
}

/** Combined shape C actually consumes: a dish plus its review rank, if any. */
export type RankedDish = Dish & {
  mentionCount: number;
  avgSentiment: number;
  score: number;
  hasReviewSignal: boolean;
  /** 1 = best-reviewed, 2 = second-best, etc. null = no review data for this dish. */
  rank: number | null;
};

/**
 * The actual hand-off to workstream C: full dish list, each one annotated
 * with review rank if we have it. Sorted #1 first, unranked dishes last.
 */
export function buildRankedMenu(dishes: Dish[], reviews: string[]): RankedDish[] {
  const { ranked } = rankMenu(dishes, reviews);
  const signalByName = new Map(ranked.map((r) => [normalizeDishName(r.dishName), r]));
  const rankByName = new Map(ranked.map((r, i) => [normalizeDishName(r.dishName), i + 1]));

  const combined: RankedDish[] = dishes.map((dish) => {
    const key = normalizeDishName(dish.name);
    const signal = signalByName.get(key);
    return {
      ...dish,
      mentionCount: signal?.mentionCount ?? 0,
      avgSentiment: signal?.avgSentiment ?? 0,
      score: signal?.score ?? 0,
      hasReviewSignal: Boolean(signal),
      rank: rankByName.get(key) ?? null,
    };
  });

  return combined.sort((a, b) => {
    if (a.rank === null && b.rank === null) return 0;
    if (a.rank === null) return 1;
    if (b.rank === null) return -1;
    return a.rank - b.rank;
  });
}
