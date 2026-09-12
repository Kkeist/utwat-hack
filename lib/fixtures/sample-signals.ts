/**
 * PLACEHOLDER for workstream B's review scoring. Workstream C develops against
 * this so neither of us waits on the other; B replaces the values with real
 * output and owns this file from then on.
 *
 * Deliberately messy, because clean mock data hides the cases that matter:
 *   - Duck Confit      overwhelming positive — the obvious pick
 *   - Steak Frites     popular but contested — lots of mentions, net zero
 *   - Ratatouille      panned, and panned INSIDE otherwise glowing reviews
 *                      (this is the case a review-level star rating gets wrong)
 *   - Cassoulet        one lonely positive mention
 *   - most dishes      absent entirely — zero mentions is the common case, and
 *                      a menu with no reviews at all must still spin
 */
import type { ReviewSignals } from '@/lib/types';

export const SAMPLE_SIGNALS: ReviewSignals = {
  'Duck Confit': { mentions: 47, score: 41 },
  'Steak Frites': { mentions: 31, score: 0 },
  'Sole Meunière': { mentions: 12, score: 9 },
  'Escargots': { mentions: 8, score: 6 },
  'Tarte Tatin': { mentions: 15, score: 14 },
  'Cassoulet': { mentions: 1, score: 1 },
  'Ratatouille': { mentions: 9, score: -7 },
  'Caesar Salad': { mentions: 4, score: -2 },
  'Crème Brûlée': { mentions: 3, score: 0 },
};
