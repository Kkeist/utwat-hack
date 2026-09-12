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
  /\bopen\b.*\btill\b/i,
  /\bbook a table\b/i,
  /\bprivate dining\b/i,
   /\bper person\b/i,
   /\bmonday\b|\btuesday\b|\bwednesday\b|\bthursday\b|\bfriday\b|\bsaturday\b|\bsunday\b/i,
/\bkitchen closes?\b/i,
/\blast (?:seating|order)s?\b/i,
/\bwalk-?ins? welcome\b/i,
/\bcash only\b/i,
/\b\d{1,2}(?:am|pm)\b.*\bto\b.*\d{1,2}(?:am|pm)\b/i,  // "5pm to 10pm" style hours
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

/** Strip inline markdown/modifier noise from a captured dish name. */
function cleanName(name: string): string {
  let n = name
    .replace(/\(.*?\)/g, '')
    .replace(/\*[^*]*\*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // strip marketing prefixes like "Our Famous", "Chef's", "House"
  let prev;
  do {
    prev = n;
    n = n.replace(/^(our|famous|classic|homemade|signature|chef'?s|house|world-famous)\s+/i, '');
  } while (n !== prev);

  return n.trim();
}
function tryAddDish(
  dishes: Dish[],
  rawName: string,
  priceRaw: string | undefined,
  category: string | undefined,
): void {
  const name = cleanName(rawName);
  if (name.length < 2) return;

  const parsed = DishSchema.safeParse({
    name,
    price: priceRaw,
    priceValue: parsePrice(priceRaw),
    category,
  });
  if (parsed.success) dishes.push(parsed.data);
}

export function parseMenu(markdown: string): Dish[] {
  const dishes: Dish[] = [];
  let category: string | undefined;
  const lines = markdown.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const heading = line.match(/^#{1,6}\s+(.*)$/);
    if (heading) {
      category = heading[1].trim();
      continue;
    }

    if (isJunkLine(line)) continue;

    // --- Markdown table ---
    if (line.startsWith('|')) {
      const nextLine = (lines[i + 1] ?? '').trim();
      const isSeparator = /^\|(\s*:?-+:?\s*\|)+$/.test(nextLine);

      if (isSeparator) {
        const headerCells = line.split('|').map((c) => c.trim()).filter(Boolean);
        const nameIdx = headerCells.findIndex((c) => /\b(dish|name|item)\b/i.test(c));
        const priceIdx = headerCells.findIndex((c) => /\bprice\b/i.test(c));

        let j = i + 2;
        while (j < lines.length && lines[j].trim().startsWith('|')) {
          const cells = lines[j]
            .split('|')
            .map((c) => c.trim())
            .filter((c) => c.length > 0);

          if (cells.length > 0) {
            const rawName = cells[nameIdx >= 0 ? nameIdx : 0];
            const priceRaw = cells[priceIdx >= 0 ? priceIdx : cells.length - 1];
            tryAddDish(dishes, rawName, priceRaw, category);
          }
          j++;
        }
        i = j - 1;
        continue;
      }
    }

    // --- Bold name: **Name** $price ---
    const bold = line.match(/^\*\*(.+?)\*\*\s*(?:—|-)?\s*(\$?\d[\d.,]*)?/);
    if (bold) {
      tryAddDish(dishes, bold[1], bold[2], category);
      continue;
    }

    // --- Plain text: "Name (mods) *tag* $price" or "Name — desc — $price" ---
    const priceMatch = line.match(/\$\d[\d.,]*/);
    if (priceMatch || /—/.test(line)) {
      let namePart = priceMatch ? line.slice(0, line.indexOf(priceMatch[0])) : line;
      namePart = namePart.split('—')[0];
      tryAddDish(dishes, namePart, priceMatch?.[0], category);
    }
  }

  return dishes;
}

/**
 * Gate on the parse. A bad parse must surface as an honest error, never as a
 * convincing-looking wrong answer.
 */
export function menuLooksReal(dishes: Dish[]): boolean {
  if (dishes.length < 5) return false;

  const withPrice = dishes.filter((d) => d.priceValue !== undefined).length;
  const categories = new Set(dishes.map((d) => d.category).filter(Boolean));
  const avgNameLen =
    dishes.reduce((sum, d) => sum + d.name.length, 0) / dishes.length;

  return (
    withPrice / dishes.length >= 0.5 &&
    categories.size >= 1 &&
    avgNameLen >= 4 &&
    avgNameLen <= 60
  );
}