/**
 * OWNER: Workstream C (game logic + API routes)
 *
 * OPTIONAL upgrade to lib/justify.ts. Nothing depends on it.
 *
 * `justify()` remains the default and always renders. This module tries to
 * replace that text with something better written, and every failure path
 * returns {} so the caller silently keeps the template:
 *
 *   - no ANTHROPIC_API_KEY set          -> {} without a network call
 *   - credits exhausted / rate limited  -> {}
 *   - API down, slow, or malformed      -> {}
 *   - timeout (hard-capped below)       -> {}
 *
 * This is why the clause banks in lib/justify.ts are not throwaway: they are
 * both the fallback AND the few-shot examples that hold the register here.
 * A model asked for "deadpan" without examples drifts into jokes within two
 * sentences, and the joke in this project is that it never winks.
 *
 * The call is made AFTER the spin has already rendered — see app/api/justify.
 * It is never in the path of a spin.
 */
import Anthropic from '@anthropic-ai/sdk';
import type { Pick } from '@/lib/types';
import { CLOSERS, OPENERS } from '@/lib/justify';

/** A slow API must never hold a request open. Below any sane UI patience. */
const TIMEOUT_MS = 8_000;

/** Keyed on dish + course + party size, matching justify()'s own seed. */
const cache = new Map<string, string>();
const keyFor = (p: Pick, partySize: number) => `${p.dish.name}|${p.course}|${partySize}`;

const SYSTEM = `You write the justification a restaurant serves with a dish that was, in fact, chosen at random. You write in the register of an institutional finding: absolute bureaucratic certainty about a coin flip.

Rules:
- Never acknowledge randomness, chance, or that this is a game. Never wink at the reader.
- No jokes, no exclamation marks, no emoji, no second person plural enthusiasm.
- Past tense and passive constructions are your friends. "The matter has been settled."
- 4 to 6 sentences. Reference the dish's own menu description and price where given.
- Where review data is supplied, cite it as corroboration or as overruled objection.
- Every dish at the table must read differently from the others.

The correct voice, for calibration:
${OPENERS.slice(0, 5).map((s) => `  ${s}`).join('\n')}
${CLOSERS.slice(0, 5).map((s) => `  ${s}`).join('\n')}`;

/**
 * Returns a map of dish name -> upgraded justification. An empty map means
 * "keep what you have" and is a completely normal result, not an error.
 */
export async function upgradeJustifications(
  picks: Pick[],
  partySize: number,
): Promise<Record<string, string>> {
  if (!picks.length) return {};

  const out: Record<string, string> = {};
  const cold = picks.filter((p) => {
    const hit = cache.get(keyFor(p, partySize));
    if (hit) out[p.dish.name] = hit;
    return !hit;
  });
  if (!cold.length) return out;

  // No key is the expected state for anyone who has not set one up. Not an error.
  if (!process.env.ANTHROPIC_API_KEY) return out;

  try {
    const client = new Anthropic();
    const response = await client.messages.create(
      {
        model: 'claude-opus-5',
        max_tokens: 2000,
        // Short prose, not a reasoning problem. Low effort keeps it quick and cheap.
        output_config: {
          effort: 'low',
          format: {
            type: 'json_schema',
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['justifications'],
              properties: {
                justifications: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['dish', 'text'],
                    properties: { dish: { type: 'string' }, text: { type: 'string' } },
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
            content: `Party of ${partySize}. Write one justification per dish.\n\n${JSON.stringify(
              cold.map((p) => ({
                dish: p.dish.name,
                course: p.course,
                price: p.dish.price,
                menuDescription: p.dish.description,
                shared: p.shared,
                seat: p.seat,
              })),
              null,
              2,
            )}`,
          },
        ],
      },
      { timeout: TIMEOUT_MS },
    );

    const text = response.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') return out;

    const parsed: unknown = JSON.parse(text.text);
    const list = (parsed as { justifications?: { dish?: string; text?: string }[] })?.justifications;
    if (!Array.isArray(list)) return out;

    for (const item of list) {
      if (!item?.dish || !item?.text) continue;
      const pick = cold.find((p) => p.dish.name === item.dish);
      if (!pick) continue; // model invented a dish; drop it rather than render it
      out[item.dish] = item.text;
      cache.set(keyFor(pick, partySize), item.text);
    }
    return out;
  } catch {
    // Rate limit, exhausted credits, bad key, network, timeout, unparseable JSON.
    // Every one of them means the same thing to the caller: keep the template.
    return out;
  }
}
