/**
 * OWNER: Workstream A (Steel plumbing)
 *
 * The only file that constructs a Steel client. Server-side only —
 * importing this from a client component leaks the key into the bundle.
 */
import Steel from 'steel-sdk';

/** True when we should never touch the network (no key, or explicitly mocked). */
export function isMocked(): boolean {
  return process.env.MOCK_STEEL === '1' || !process.env.STEEL_API_KEY;
}

let client: Steel | null = null;

/**
 * NB: the constructor option is `steelAPIKey`, NOT `apiKey`. Passing `apiKey`
 * fails at request time with an unhelpful 401, not at construction. (Design doc §12.)
 */
export function steel(): Steel {
  if (!process.env.STEEL_API_KEY) {
    throw new Error('STEEL_API_KEY is not set. Copy .env.example to .env.local.');
  }
  client ??= new Steel({ steelAPIKey: process.env.STEEL_API_KEY });
  return client;
}

/** Hard ceiling on session creation, per the risk table. */
export const SESSION_TIMEOUT_MS = 120_000;
