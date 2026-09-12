/**
 * OWNER: Workstream B (parsing, cache, scripts)
 *
 * markdown -> Dish[]. The actual hard part (design doc §8): there is no standard
 * markup for restaurant menus.
 *
 * Shapes to handle:
 *   - markdown headings as categories
 *   - `**Name** $12`
 *   - `Name — description — $12`
 *   - markdown tables (detect the header row via the alignment separator)
 *   - a description line that follows a priced line
 *   - priceless items on prix-fixe menus
 *
 * Tune for PRECISION, not recall. 20 real dishes beats 60 rows where a third are
 * nav links and opening hours.
 *
 * Every token in every junk/classifier regex must be \b-anchored. See §8.
 * Run `npm run probe` after any change to this file.
 */
import { DishSchema, type Dish } from '@/lib/types';

/** Lines that are never dishes: nav, hours, addresses, social, legal. */
const JUNK = [
  /\bfollow us\b/i,
  /\bprivacy\b/i,
  /\bcareers\b/i,
  /\breservations?\b/i,
  /\bgift cards?\b/i,
  // TODO(B): extend. Anchor every token. `/fri/` would eat Steak Frites.
];

export function isJunkLine(line: string): boolean {
  return JUNK.some((re) => re.test(line));
}

/** "$31" -> 31. "MP" / "Market" -> undefined. */
export function parsePrice(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const m = raw.match(/(\d+(?:[.,]\d{1,2})?)/);
  return m ? Number(m[1].replace(',', '.')) : undefined;
}

/**
 * PLACEHOLDER — handles only `**Name** $12` under `##` headings.
 * Workstream B replaces this wholesale. It exists so the rest of the app walks.
 */
export function parseMenu(markdown: string): Dish[] {
  const dishes: Dish[] = [];
  let category: string | undefined;

  // Split on CRLF as well as LF. Git hands Windows checkouts CRLF and scraped
  // pages carry it too; a trailing \r defeats any regex anchored with $, which
  // silently drops every category and files the whole menu as 'other'.
  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    if (heading) {
      category = heading[1].trim();
      continue;
    }
    if (isJunkLine(line)) continue;

    const m = line.match(/^\*\*(.+?)\*\*\s*(?:—|-)?\s*(\$?\d[\d.,]*)?/);
    if (!m) continue;

    const parsed = DishSchema.safeParse({
      name: m[1].trim(),
      price: m[2],
      priceValue: parsePrice(m[2]),
      category,
    });
    if (parsed.success) dishes.push(parsed.data);
  }
  return dishes;
}

/**
 * Gate on the parse. A bad parse must surface as an honest error, never as a
 * convincing-looking wrong answer.
 */
export function menuLooksReal(dishes: Dish[]): boolean {
  // TODO(B): tighten. Candidate signals: a floor on count, a majority having
  // prices, more than one category, average name length in a sane band.
  return dishes.length >= 5;
}
