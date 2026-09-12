/**
 * PROPOSED by workstream C — lib/review-signals.ts stays workstream B's file and
 * is not modified. This wraps it; B can adopt, move, or delete this wholesale.
 *
 * Returns B's own `DishSignal[]`, so it is a drop-in for `buildDishSignals()`.
 * Every failure path falls back to that lexicon scorer:
 *
 *   - no ANTHROPIC_API_KEY        -> lexicon, no network call
 *   - credits exhausted / 429     -> lexicon
 *   - API down, slow, bad JSON    -> lexicon
 *
 * WHY THIS IS WORTH A MODEL CALL — three failures reproduced against the lexicon:
 *
 *   1. Clause bleed. "The duck confit was incredible, best I've had, but the
 *      Ratatouille was bland and disappointing" scores Ratatouille at +1. The
 *      ±60-char window spans the `but`, so the duck's praise lands on the
 *      ratatouille. Sentiment has to be judged per clause, not per window.
 *   2. Index drift. scoreDishMention indexOf's the NORMALIZED review but slices
 *      the ORIGINAL text; they differ in length, so the window is offset.
 *   3. No food vocabulary. AFINN does not contain bland, watery, underseasoned,
 *      soggy, greasy or overcooked. Two clearly negative reviews scored 0.
 *
 * WHERE THIS RUNS: at scrape/warm time, once per restaurant, cached. Never in
 * the path of a spin — so a slow or dead API cannot affect the live demo.
 */
import Anthropic from '@anthropic-ai/sdk';
import { buildDishSignals, type DishSignal } from '@/lib/review-signals';

/**
 * Runs at warm/scrape time, not in a request, so it can afford to wait. One
 * retry is worth having here because a warm run that falls back to the lexicon
 * poisons the cache for the whole demo. maxRetries is pinned so the worst case
 * is a knowable 2 x TIMEOUT_MS rather than the SDK default's 3x.
 */
const TIMEOUT_MS = 45_000;

const SYSTEM = `You score restaurant dishes from customer reviews.

For every dish named in the reviews, judge the sentiment of THAT DISH's own clause — not the review's overall tone and not the surrounding sentence. A glowing review routinely pans one dish: "the duck was incredible but the ratatouille was bland" is positive for the duck and negative for the ratatouille. Split on contrastive conjunctions (but, however, though, although, whereas, other than) and judge each side separately.

Score food language specifically: bland, watery, underseasoned, soggy, greasy, dry, overcooked, rubbery, tough and lukewarm are negative even though a general sentiment lexicon misses them.

Return, for each dish mentioned at all:
  dish      the dish name exactly as given in the menu list
  mentions  how many separate clauses across all reviews name it
  sentiment the average sentiment of those clauses, from -5 (awful) to +5 (superb)

Omit dishes that no review mentions. If a clause names two dishes comparatively ("the duck was better than the lamb"), skip that clause rather than guess.`;

export async function buildDishSignalsWithClaude(
  reviews: string[],
  dishNames: string[],
): Promise<{ signals: DishSignal[]; source: 'claude' | 'lexicon' }> {
  const lexicon = () => ({ signals: buildDishSignals(reviews, dishNames), source: 'lexicon' as const });

  if (!reviews.length || !dishNames.length) return lexicon();
  if (!process.env.ANTHROPIC_API_KEY) return lexicon();

  try {
    const client = new Anthropic({ maxRetries: 1 });
    const response = await client.messages.create(
      {
        model: 'claude-opus-5',
        max_tokens: 8000,
        output_config: {
          effort: 'low',
          format: {
            type: 'json_schema',
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['dishes'],
              properties: {
                dishes: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['dish', 'mentions', 'sentiment'],
                    properties: {
                      dish: { type: 'string' },
                      mentions: { type: 'number' },
                      sentiment: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
        system: SYSTEM,
        messages: [
          {
            role: 'user',
            content: `Menu dishes:\n${dishNames.join('\n')}\n\nReviews:\n${reviews
              .map((r, i) => `[${i + 1}] ${r}`)
              .join('\n')}`,
          },
        ],
      },
      { timeout: TIMEOUT_MS },
    );

    const text = response.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') return lexicon();

    const parsed = JSON.parse(text.text) as {
      dishes?: { dish?: string; mentions?: number; sentiment?: number }[];
    };
    if (!Array.isArray(parsed.dishes)) return lexicon();

    const known = new Set(dishNames);
    const signals: DishSignal[] = [];
    for (const d of parsed.dishes) {
      // Drop anything the model invented — a hallucinated dish must never reach the wheel.
      if (!d?.dish || !known.has(d.dish)) continue;
      const mentionCount = Math.max(1, Math.round(d.mentions ?? 1));
      const avgSentiment = Number(d.sentiment ?? 0);
      if (!Number.isFinite(avgSentiment)) continue;
      signals.push({
        dishName: d.dish,
        mentionCount,
        avgSentiment,
        // Same confidence weighting B uses, so both sources land on one scale.
        score: avgSentiment * Math.log2(mentionCount + 1),
      });
    }
    return signals.length ? { signals, source: 'claude' } : lexicon();
  } catch {
    return lexicon();
  }
}
