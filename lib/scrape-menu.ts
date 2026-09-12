/**
 * OWNER: Workstream A (Steel plumbing)
 *
 * Two-tier menu fetch.
 *   Tier 1  Steel /scrape          — one HTTP call, ~1-2s, no session lifecycle.
 *   Tier 2  session + Playwright   — only when tier 1 looks wrong (tabs, accordions,
 *                                    lazy-loaded JS). Also the demo moment: return
 *                                    `sessionViewerUrl` so the audience watches it work.
 *
 * CONTRACT: returns markdown. Parsing is not your problem (that is lib/parse-menu).
 * Every session must be released in a `finally`. Creation is capped at SESSION_TIMEOUT_MS.
 */
import type { MenuScrape } from '@/lib/types';
import { isMocked } from '@/lib/steel';
import { sampleMenuMarkdown } from '@/lib/fixtures';

/**
 * Cheap heuristic deciding whether tier 1 output is worth parsing, or whether we
 * need to pay for a real browser. Keep this cheap — it runs on every request.
 */
export function scrapeLooksThin(markdown: string): boolean {
  // TODO(A): real signal. Candidate checks: length floor, absence of any currency
  // symbol, a nav-only page, an obvious cookie-wall, a "menu" link but no prices.
  return markdown.trim().length < 400 || !/[$£€]\s?\d/.test(markdown);
}

export async function scrapeMenu(url: string): Promise<MenuScrape> {
  if (isMocked()) {
    return { markdown: sampleMenuMarkdown(), source: 'scrape' };
  }
  // TODO(A): tier 1 — steel().scrape({ url, format: ['markdown'] })
  // TODO(A): if scrapeLooksThin(...), fall through to tier 2.
  throw new Error('scrapeMenu is not implemented yet. Run with MOCK_STEEL=1.');
}

/** Tier 2. Create session -> connect playwright-core over CDP -> expand -> markdown. */
export async function scrapeMenuWithBrowser(url: string): Promise<MenuScrape> {
  // TODO(A): steel().sessions.create(), connect over session.websocketUrl,
  // click likely menu tabs/accordions, wait for network idle, extract, then
  // ALWAYS steel().sessions.release(id) in a finally.
  throw new Error('scrapeMenuWithBrowser is not implemented yet.');
}
