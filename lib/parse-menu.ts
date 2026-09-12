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

/** "$31" / "31 €" / "€12" / "12.50" -> 31. "MP" / "Market" -> undefined. */
export function parsePrice(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const m = raw.match(/(\d+(?:[.,]\d{1,2})?)/);
  return m ? Number(m[1].replace(',', '.')) : undefined;
}

/** $12, €9, 29 €, 26,50 EUR, £8, GBP 12 — the shapes Steel actually returns. */
const MARKED_PRICE =
  /[$£€]\s?\d[\d.,]*|\d+(?:[.,]\d{2})?\s*€|\d+[.,]\d{2}\s*(?:eur|usd|gbp)\b|(?:eur|usd|gbp)\s*\d[\d.,]*/i;

const COURSE_HEADING =
  /^(starters?|appetizers?|antipasti|entradas|hors d['’]?oeuvres?|entr[eé]es?|mains?|main courses?|plats?(?:\s+principaux)?|from the (?:sea|land|grill)|desserts?|sweets?|puddings?|drinks?|beverages?|wines?|cocktails?|sides?|salads?|soups?|garnitures?|accompagnements?|menu|carte|prix[\s-]?fixe)\b/i;

export function extractPrice(line: string): { raw: string; index: number } | undefined {
  const marked = line.match(MARKED_PRICE);
  if (marked && marked.index !== undefined) {
    return { raw: marked[0].trim(), index: marked.index };
  }
  if (!/[A-Za-zÀ-ÿ]{4,}/.test(line)) return undefined;
  if (line.length > 180) return undefined;
  const trailing = line.match(/[\s–—-]\s*(\d{1,3}(?:[.,]\d{2})?)\s*$/);
  if (!trailing || trailing.index === undefined) return undefined;
  return { raw: trailing[1], index: trailing.index };
}

/** "Soupe à l'Oignon 20" -> name without the 20, plus that price. */
export function peelTrailingPrice(text: string): { name: string; price?: string } {
  const t = text.trim();
  const priced = extractPrice(t);
  if (!priced) return { name: t };
  const name = t.slice(0, priced.index).trim();
  return { name: name || t, price: priced.raw };
}

/** Strip inline markdown/modifier noise from a captured dish name. */
function cleanName(name: string): string {
  let n = name
    .replace(/\(.*?\)/g, '')
    .replace(/\*[^*]*\*/g, '')
    .replace(/^\*+|\*+$/g, '')
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
  description?: string,
): void {
  const peeled = peelTrailingPrice(rawName);
  const name = cleanName(peeled.name);
  if (name.length < 2) return;
  if (looksLikeDescription(name)) return;
  if (/^(?:[A-ZÀ-Ÿ] ){2,}[A-ZÀ-Ÿ]$/.test(name)) return;

  const parsed = DishSchema.safeParse({
    name,
    price: priceRaw ?? peeled.price,
    priceValue: parsePrice(priceRaw ?? peeled.price),
    category,
    description,
  });
  if (parsed.success) dishes.push(parsed.data);
}

const BARE_PRICE_LINE = /^\d{1,3}(?:[.,]\d{2})(?:\s*\/\s*\d{1,3}(?:[.,]\d{2}))?\s*$/;
const BOWL_CUP_PRICE = /\b(?:bowl|cup|glass|bottle)\s+(\d{1,3}(?:[.,]\d{2})?)/i;

function unwrapItalics(line: string): string {
  let t = line.replace(/\\([*_])/g, '$1').trim();
  if (t.startsWith('**') || t.startsWith('#')) return t;
  if (/^\*[^*]/.test(t)) {
    t = t.replace(/^\*+/, '').replace(/\*+$/, '').trim();
  }
  return t;
}

function looksLikeDescription(line: string): boolean {
  const t = unwrapItalics(line);
  if (/^(with|and|served|on |in |topped|dressed|choice of)\b/i.test(t)) return true;
  if (/^[a-z]/.test(t)) return true;
  return false;
}

function looksLikeDishName(line: string): boolean {
  const n = cleanName(unwrapItalics(line).replace(/\*+$/, ''));
  if (n.length < 2 || n.length > 80) return false;
  if (!/[A-Za-zÀ-ÿ]{3,}/.test(n)) return false;
  if (/^https?:/i.test(line)) return false;
  if (/eating raw or undercooked|gluten[\s-]?free options|staff portal|gift cards?/i.test(line)) {
    return false;
  }
  if (/^\d{1,2}[./]\d{1,2}/.test(n)) return false;
  if (/^(?:[A-ZÀ-Ÿ] ){2,}[A-ZÀ-Ÿ]$/.test(n)) return false;
  return true;
}

export function parseMenu(markdown: string): Dish[] {
  const dishes: Dish[] = [];
  let category: string | undefined;
  let pending: { name: string; description?: string; category?: string } | undefined;
  const lines = markdown.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw) continue;
    const italic = /^\*[^*]/.test(raw.replace(/\\([*_])/g, '$1')) && !raw.replace(/\\([*_])/g, '$1').startsWith('**');
    const line = unwrapItalics(raw);

    const heading = line.match(/^#{1,6}\s+(.*)$/);
    if (heading) {
      pending = undefined;
      category = heading[1].replace(/\*+/g, '').trim();
      continue;
    }

    const boldOnly = line.match(/^\*\*([^*]+)\*\*$/);
    if (boldOnly && COURSE_HEADING.test(boldOnly[1].trim())) {
      pending = undefined;
      category = boldOnly[1].trim();
      continue;
    }
    if (!line.includes('*') && COURSE_HEADING.test(line) && !extractPrice(line) && !BARE_PRICE_LINE.test(line)) {
      pending = undefined;
      category = line.replace(/[:.]+$/, '').trim();
      continue;
    }

    if (isJunkLine(line)) continue;

    const bare = line.match(BARE_PRICE_LINE);
    const bowl = line.match(BOWL_CUP_PRICE);
    if (bare || (bowl && !/[A-Za-zÀ-ÿ]{8,}/.test(line))) {
      const raw = bare ? bare[0].trim() : bowl![1];
      if (pending) {
        tryAddDish(dishes, pending.name, raw, pending.category ?? category, pending.description);
        pending = undefined;
      }
      continue;
    }

    // --- Markdown table ---
    if (line.startsWith('|')) {
      pending = undefined;
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

    // --- Bold name: **Name** $12 / **Name 20** (PDF menus) ---
    const bold = line.match(/^\*\*(.+?)\*\*\s*(?:—|-|–)?\s*(.*)$/);
    if (bold) {
      pending = undefined;
      const inner = bold[2] ? `${bold[1]} ${bold[2]}` : bold[1];
      const priced = extractPrice(inner) ?? extractPrice(line);
      const namePart = priced ? peelTrailingPrice(bold[1]).name : bold[1];
      tryAddDish(dishes, namePart, priced?.raw, category);
      continue;
    }

    // --- Plain text: "Name $12", "Name 24 €", "Name — desc — $12" ---
    const priced = extractPrice(line);
    if (priced) {
      pending = undefined;
      let namePart = line.slice(0, priced.index);
      namePart = namePart.split(/[—–]/)[0];
      tryAddDish(dishes, namePart, priced.raw, category);
      continue;
    }

    if (/[—–]/.test(line)) {
      pending = undefined;
      tryAddDish(dishes, line.split(/[—–]/)[0], undefined, category);
      continue;
    }

    // Name on this line, price on a later line (Balthazar / many Steel dumps).
    if (pending && (italic || looksLikeDescription(line))) {
      pending.description = pending.description ? `${pending.description} ${line}` : line;
      continue;
    }
    if (looksLikeDishName(line)) {
      pending = { name: cleanName(unwrapItalics(line).replace(/\*+$/, '')), category };
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

  if (withPrice / dishes.length < 0.5) return false;
  if (avgNameLen < 4 || avgNameLen > 60) return false;
  // Steel markdown often has no # headings. Enough priced dishes is the real gate.
  if (categories.size >= 1) return true;
  return dishes.length >= 8 && withPrice >= 6;
}