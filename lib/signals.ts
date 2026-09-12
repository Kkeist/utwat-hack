/**
 * OWNER: Workstream C (game logic + API routes)
 *
 * Adapter between workstream B's `DishSignal[]` (lib/review-signals.ts) and the
 * `ReviewSignals` map the roulette consumes. B keys by dish name and carries the
 * intermediate values it computed; C only needs two numbers per dish.
 *
 * NOTE ON SCORE SEMANTICS — these two are not the same quantity.
 *   types.ts documents `score` as a net count: +1 per positive clause, -1 per
 *   negative, so its magnitude tracks how many people said something.
 *   B computes `avgSentiment * log2(mentions + 1)` — an average weighted by a
 *   confidence factor, so magnitude tracks how strongly people felt.
 *
 * Both are signed and both grow with agreement, so `weightFor()`'s sqrt damping
 * behaves sensibly on either. But the contract in types.ts should be reworded to
 * match what B actually produces rather than leaving two definitions in the repo.
 */
import type { DishSignal } from '@/lib/review-signals';
import type { ReviewSignals } from '@/lib/types';

export function toReviewSignals(signals: DishSignal[]): ReviewSignals {
  const out: ReviewSignals = {};
  for (const s of signals) {
    out[s.dishName] = { mentions: s.mentionCount, score: s.score };
  }
  return out;
}
