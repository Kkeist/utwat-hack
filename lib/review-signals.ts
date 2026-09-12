/**
 * OWNER: Workstream B
 *
 * Matches dish names against review text and scores sentiment around each
 * mention. No model — deterministic lexicon-based scoring via `sentiment`.
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

/** Find which dish names are mentioned in a single review's text. */
export function findDishMentions(reviewText: string, dishNames: string[]): string[] {
  const normalizedReview = normalizeDishName(reviewText);
  return dishNames.filter((dish) => {
    const normDish = normalizeDishName(dish);
    if (!normDish) return false;
    const pattern = new RegExp(`\\b${normDish.replace(/\s+/g, '\\s+')}\\b`, 'i');
    return pattern.test(normalizedReview);
  });
}

/** Score sentiment in a window of text around where the dish is mentioned. */
export function scoreDishMention(reviewText: string, dishName: string): number {
  const normDish = normalizeDishName(dishName);
  const normReview = normalizeDishName(reviewText);
  const idx = normReview.indexOf(normDish);
  if (idx === -1) return 0;

  const window = reviewText.slice(Math.max(0, idx - 60), idx + normDish.length + 60);
  return sentiment.analyze(window).score;
}

function computeScore(mentionCount: number, avgSentiment: number): number {
  const confidence = Math.log2(mentionCount + 1);
  return avgSentiment * confidence;
}

/** Aggregate mention count + average sentiment per dish across all reviews. */
export function buildDishSignals(reviews: string[], dishNames: string[]): DishSignal[] {
  const totals = new Map<string, { total: number; count: number }>();

  for (const review of reviews) {
    for (const dish of findDishMentions(review, dishNames)) {
      const score = scoreDishMention(review, dish);
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