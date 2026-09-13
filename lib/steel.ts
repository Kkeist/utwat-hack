/**
 * OWNER: Workstream A (Steel plumbing)
 *
 * The only file that constructs a Steel client. Server-side only —
 * importing this from a client component leaks the key into the bundle.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Steel from 'steel-sdk';

/**
 * .env.local wins over process.env. Next does not override a variable that is
 * already set in the parent shell, so a leftover MOCK_STEEL=1 kept serving the
 * fixture menu after we flipped the file to 0.
 */
function readDotEnvLocal(): Record<string, string> {
  try {
    const text = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
    const out: Record<string, string> = {};
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      out[key] = val;
    }
    return out;
  } catch {
    return {};
  }
}

function env(name: string): string | undefined {
  const value = readDotEnvLocal()[name] ?? process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

/** True when we should never touch the network (no key, or explicitly mocked). */
export function isMocked(): boolean {
  return env('MOCK_STEEL') === '1' || !env('STEEL_API_KEY');
}

let client: Steel | null = null;
let clientKey: string | undefined;

/**
 * NB: the constructor option is `steelAPIKey`, NOT `apiKey`. Passing `apiKey`
 * fails at request time with an unhelpful 401, not at construction. (Design doc §12.)
 */
export function steel(): Steel {
  const steelAPIKey = env('STEEL_API_KEY');
  if (!steelAPIKey) {
    throw new Error('STEEL_API_KEY is not set. Copy .env.example to .env.local.');
  }
  if (!client || clientKey !== steelAPIKey) {
    client = new Steel({ steelAPIKey });
    clientKey = steelAPIKey;
  }
  return client;
}

export function steelApiKey(): string | undefined {
  return env('STEEL_API_KEY');
}

/** Hard ceiling on session creation, per the risk table. */
export const SESSION_TIMEOUT_MS = 120_000;
