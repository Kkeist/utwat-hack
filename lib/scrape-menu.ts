/**
 * OWNER: Workstream A (Steel plumbing)
 *
 * Two-tier menu fetch.
 *   Tier 1  Steel /scrape          — one HTTP call, ~1-2s, no session lifecycle.
 *   Discover follow same-origin Menu links when tier 1 looks like a homepage.
 *   Tier 2  session + Playwright   — only when that still looks wrong (tabs, JS).
 *
 * CONTRACT: returns markdown. Parsing is not your problem (that is lib/parse-menu).
 * Names without prices are still a valid scrape — do not drop them here.
 * Every session must be released in a `finally`. Creation is capped at SESSION_TIMEOUT_MS.
 */
import { chromium, type Page } from 'playwright-core';
import type { MenuScrape } from '@/lib/types';
import { isMocked, SESSION_TIMEOUT_MS, steel } from '@/lib/steel';
import { sampleMenuMarkdown } from '@/lib/fixtures';

const MAX_MENU_FOLLOWS = 2;

/** EN/FR/ES/IT/DE/PT/NL/SV + CJK/KO/RU/AR. Used for paths, link text, PDF names, nav clicks. */
const MENU_SLUG =
  /menus?|la-carte|a-la-carte|ala-carte|carte|carta|cardapio|ementa|speisekarte|menukaart|speisen|meny|menue|pranzo|cena|comida|breakfast|brunch|lunch|dinner|dining|food|degustation|omakase|kaiseki|karte/;
const MENU_PATH = new RegExp(`/(?:${MENU_SLUG.source})(?:/|$|\\?)`, 'i');
const MENU_PATH_TAIL = new RegExp(`/(?:${MENU_SLUG.source})$`, 'i');
const MENU_TEXT = new RegExp(
  String.raw`(?:\b(?:${MENU_SLUG.source}|men[uúùü])\b)|メニュー|菜单|菜單|메뉴|меню|قائمة`,
  'i',
);
const MENU_NAV_CLICK =
  /^(menus?|la carte|carte|carta|speisekarte|menukaart|meny|menú|menù|菜单|菜單|メニュー|메뉴)$/i;
const CONVENTIONAL_MENU_SEGMENTS = [
  'menu',
  'menus',
  'carte',
  'carta',
  'speisekarte',
  'menukaart',
  'cardapio',
  'meny',
];
const JUNK_LINK =
  /\b(reservations?|book a table|gift cards?|careers?|privacy|instagram|facebook|twitter|tiktok|yelp|doordash|uber\s?eats|grubhub|opentable|tripadvisor)\b/i;
/** $12, €9, 29 €, 26,50 EUR, or a dish line that ends in a bare 20 / 16. */
const PRICE =
  /(?:[$£€]\s?\d|\d+(?:[.,]\d{2})?\s*€|\d+[.,]\d{2}\s*(?:eur|usd|gbp)\b|\b(?:eur|usd|gbp)\s*\d)/i;
const MD_LINK = /\[([^\]]*)\]\(([^)\s]+)\)/g;
const RAW_URL = /https?:\/\/[^\s)\]>'"]+/gi;

export interface SteelLink {
  text: string;
  url: string;
}

export interface ScrapedPage {
  url: string;
  markdown: string;
  links: SteelLink[];
  restaurantName?: string;
}

/** One hop in discovery. markdown is kept so scrape-raw can dump the whole path. */
export interface ScrapeHop {
  url: string;
  chars: number;
  thin: boolean;
  score: number;
  markdown?: string;
}

/** Trace so scrape-raw can show which URL we kept. Not part of the shared API type. */
export interface ScrapeTrace {
  result: MenuScrape;
  startUrl: string;
  chosenUrl: string;
  tried: ScrapeHop[];
  candidates: string[];
  /** Homepage / about page — hours, address, story. Not the menu. */
  generalUrl?: string;
  generalMarkdown?: string;
}

function boldNameCount(text: string): number {
  return text.match(/\*\*[^*]{3,80}\*\*/g)?.length ?? 0;
}

function dishLinePriceCount(text: string): number {
  return text.split(/\n/).filter((line) => {
    const t = line.trim();
    if (t.length < 12 || t.length > 180) return false;
    if (!/[A-Za-zÀ-ÿ]{4,}/.test(t)) return false;
    return /(?:\s|[-–—])\d{1,3}(?:[.,]\d{2})?\s*$/.test(t);
  }).length;
}

function priceCount(text: string): number {
  const marked = [...text.matchAll(new RegExp(PRICE.source, 'gi'))].length;
  return marked + dishLinePriceCount(text);
}

/**
 * Look for a Menu page unless this already looks like a menu.
 * Headings alone (about / private hire / hours) do not count.
 * Prices or a dish-like name list do. Names without prices still pass.
 */
export function scrapeLooksThin(markdown: string): boolean {
  const text = markdown.trim();
  if (text.length < 400) return true;
  if (priceCount(text) >= 2) return false;
  return boldNameCount(text) < 5;
}

/** Higher = more likely a menu page. Prices weight high; names still count. */
export function scoreMenuMarkdown(markdown: string): number {
  const text = markdown.trim();
  if (!text) return 0;
  const length = Math.min(text.length, 12_000) / 200;
  return priceCount(text) * 8 + boldNameCount(text) * 2 + length;
}

function hostKey(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return undefined;
  }
}

function normalizeUrl(raw: string, base: string): string | undefined {
  try {
    const u = new URL(raw, base);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return undefined;
    u.hash = '';
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.href;
  } catch {
    return undefined;
  }
}

const PLATFORM_NAME =
  /\b(zenchef|wix|squarespace|wordpress|shopify|thefork|la\s*fourchette|opentable|resy|toasttab|bentobox|godaddy|modulejs|weebly|webflow)\b/i;

function isJunkRestaurantName(s: string): boolean {
  if (s.length < 2 || s.length > 60) return true;
  if (PLATFORM_NAME.test(s)) return true;
  if (/^(restaurants?|caf[eé]s?|glaciers?|brasseries?|bars?|hotels?|home|accueil|menu|welcome)$/i.test(s)) {
    return true;
  }
  if (/\d{2,}/.test(s) && /\b(rue|street|blvd|avenue|road)\b/i.test(s)) return true;
  return false;
}

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '');
}

function compactName(s: string): string {
  return stripAccents(s).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function nameFromHost(url: string): string | undefined {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, '');
    const slug = host.split('.')[0] ?? '';
    if (slug.length < 3 || PLATFORM_NAME.test(slug)) return undefined;
    return slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {
    return undefined;
  }
}

function nameMatchesDomain(candidate: string, domainName: string): boolean {
  const a = compactName(candidate);
  const b = compactName(domainName);
  if (a.length < 4 || b.length < 4) return a === b;
  return a.includes(b) || b.includes(a);
}

function cleanRestaurantName(raw: string): string {
  let s = raw.replace(/\s+/g, ' ').trim();
  const parts = s.split(/\s*[|–—•·]\s+|\s+-\s+/);
  if (parts.length > 1) {
    const first = parts[0].trim();
    if (first.length >= 2 && !/^(home|accueil|menu|welcome|welcome to)$/i.test(first)) {
      s = first;
    }
  }
  return s.replace(/\s+(official site|homepage|accueil|home)$/i, '').trim().slice(0, 80);
}

function namesFromMarkdown(markdown: string): string[] {
  const out: string[] = [];
  for (const m of markdown.matchAll(/^#{1,3}\s+(.+)$/gm)) {
    const cleaned = cleanRestaurantName(m[1]);
    if (!isJunkRestaurantName(cleaned) && !/^(menus?|carte|carta)$/i.test(cleaned)) {
      out.push(cleaned);
    }
  }
  return out;
}

/**
 * Domain is the source of truth. A heading/title is used only if it verifies
 * against that slug (e.g. procope.com + "Le Procope"). Platform names never win.
 */
function nameFromSteelMeta(
  meta: { ogSiteName?: string; ogTitle?: string; title?: string },
  pageUrl: string,
  markdown: string,
): string | undefined {
  const fromDomain = nameFromHost(pageUrl);
  const fromMeta = [meta.ogSiteName, meta.ogTitle, meta.title]
    .map((raw) => (raw?.trim() ? cleanRestaurantName(raw) : ''))
    .filter((s) => s && !isJunkRestaurantName(s));
  const pool = [...namesFromMarkdown(markdown), ...fromMeta];

  if (fromDomain) {
    const verified = pool.find((n) => nameMatchesDomain(n, fromDomain));
    return verified ?? fromDomain;
  }
  return pool[0];
}

function isPdfUrl(url: string): boolean {
  return /\.pdf(\?|#|$)/i.test(url);
}

function looksLikeHome(url: string): boolean {
  if (isPdfUrl(url)) return false;
  try {
    const p = new URL(url).pathname.replace(/\/$/, '') || '/';
    return p === '/' || /^\/[a-z]{2}$/i.test(p);
  } catch {
    return false;
  }
}

/** Site root, or /en/ when the URL is under a language prefix. */
export function siteHomeUrl(pageUrl: string): string | undefined {
  try {
    const u = new URL(pageUrl);
    const parts = u.pathname.split('/').filter(Boolean);
    const homePath = parts[0] && /^[a-z]{2}$/i.test(parts[0]) ? `/${parts[0]}/` : '/';
    const home = `${u.origin}${homePath}`;
    if (looksLikeHome(pageUrl) && normalizeUrl(pageUrl, pageUrl) === normalizeUrl(home, home)) {
      return undefined;
    }
    return home;
  } catch {
    return undefined;
  }
}

function decodePath(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

function scoreMenuLink(pageUrl: string, link: SteelLink): number {
  const href = normalizeUrl(link.url, pageUrl);
  if (!href) return -Infinity;
  if (hostKey(href) !== hostKey(pageUrl)) return -Infinity;
  const haystack = `${link.text} ${href}`;
  if (JUNK_LINK.test(haystack)) return -Infinity;

  const path = decodePath(new URL(href).pathname);
  if (isPdfUrl(href)) {
    if (MENU_TEXT.test(haystack) || MENU_SLUG.test(path)) return 12;
    return -Infinity;
  }

  if (!MENU_PATH.test(path)) return -Infinity;
  let score = 4;
  if (MENU_TEXT.test(link.text)) score += 3;
  if (MENU_PATH_TAIL.test(path.replace(/\/$/, ''))) score += 2;
  return score;
}

/** Markdown [text](url) plus bare http(s) URLs — nav often lands here, not in Steel `links`. */
export function linksFromMarkdown(markdown: string): SteelLink[] {
  const out: SteelLink[] = [];
  for (const m of markdown.matchAll(MD_LINK)) {
    out.push({ text: m[1], url: m[2] });
  }
  for (const m of markdown.matchAll(RAW_URL)) {
    out.push({ text: '', url: m[0] });
  }
  return out;
}

/** If the nav never made it into HTML, try /menus /menu /carte next to this URL. */
function conventionalMenuUrls(pageUrl: string): string[] {
  try {
    if (isPdfUrl(pageUrl)) return [];
    const u = new URL(pageUrl);
    if (MENU_PATH.test(decodePath(u.pathname))) return [];
    let dir = u.pathname || '/';
    if (/\.[a-z0-9]+$/i.test(dir)) {
      dir = dir.replace(/[^/]+$/, '');
    } else if (!dir.endsWith('/')) {
      dir += '/';
    }
    const current = normalizeUrl(pageUrl, pageUrl);
    const guessed: string[] = [];
    for (const seg of CONVENTIONAL_MENU_SEGMENTS) {
      const href = normalizeUrl(`${dir}${seg}`, pageUrl);
      if (href && href !== current) guessed.push(href);
    }
    return guessed;
  } catch {
    return [];
  }
}

/** PDF menu files on this page (Wix hashes included — score uses link text like "Dinner Menu"). */
export function menuPdfUrls(
  pageUrl: string,
  links: SteelLink[],
  markdown = '',
  limit = MAX_MENU_FOLLOWS,
): string[] {
  const origin = normalizeUrl(pageUrl, pageUrl);
  const scored = new Map<string, number>();
  const combined = [...links, ...linksFromMarkdown(markdown)];

  for (const link of combined) {
    const href = normalizeUrl(link.url, pageUrl);
    if (!href || href === origin || !isPdfUrl(href)) continue;
    const score = scoreMenuLink(pageUrl, link);
    if (score <= 0) continue;
    scored.set(href, Math.max(scored.get(href) ?? 0, score));
  }

  return [...scored.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([href]) => href);
}

/** Same-origin Menu-ish HTML links, then conventional /menu paths. PDFs are a second hop. */
export function menuCandidateUrls(
  pageUrl: string,
  links: SteelLink[],
  markdown = '',
  limit = MAX_MENU_FOLLOWS,
): string[] {
  const origin = normalizeUrl(pageUrl, pageUrl);
  const scored = new Map<string, number>();
  const combined = [...links, ...linksFromMarkdown(markdown)];

  for (const link of combined) {
    const href = normalizeUrl(link.url, pageUrl);
    if (!href || href === origin) continue;
    const score = scoreMenuLink(pageUrl, link);
    if (score <= 0) continue;
    scored.set(href, Math.max(scored.get(href) ?? 0, score));
  }

  const html = [...scored.entries()]
    .filter(([href]) => !isPdfUrl(href))
    .sort((a, b) => b[1] - a[1])
    .map(([href]) => href);

  const pdfs = [...scored.entries()]
    .filter(([href]) => isPdfUrl(href))
    .sort((a, b) => b[1] - a[1])
    .map(([href]) => href);

  // Prefer a menu PDF on this page (Petit Lutetia). Fill remaining slots with HTML + guesses.
  const ranked = [...pdfs, ...html];
  if (ranked.length < limit) {
    for (const guess of conventionalMenuUrls(pageUrl)) {
      if (!ranked.includes(guess)) ranked.push(guess);
    }
  }

  return ranked.slice(0, limit);
}

async function extractPdfText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { Accept: 'application/pdf,*/*' },
    redirect: 'follow',
  });
  if (!res.ok) return '';
  const { extractText } = await import('unpdf');
  const extracted = await extractText(new Uint8Array(await res.arrayBuffer()), {
    mergePages: true,
  });
  return extracted.text.replace(/\n{3,}/g, '\n\n').trim();
}

async function scrapePage(url: string, delay = 0): Promise<ScrapedPage> {
  if (isPdfUrl(url)) {
    try {
      const result = await steel().scrape({ url, format: ['markdown'] });
      const markdown = (result.content.markdown ?? '').trim();
      if (!scrapeLooksThin(markdown)) {
        return {
          url,
          markdown,
          links: [],
          restaurantName: nameFromSteelMeta(result.metadata, url, markdown),
        };
      }
    } catch {
      // PDF binaries often fail /scrape — fall through to local text extract.
    }
    return {
      url,
      markdown: await extractPdfText(url),
      links: [],
      restaurantName: nameFromHost(url),
    };
  }

  const result = await steel().scrape({
    url,
    format: ['markdown'],
    ...(delay > 0 ? { delay } : {}),
  });
  const markdown = result.content.markdown ?? '';
  return {
    url,
    markdown,
    links: result.links.map((l) => ({ text: l.text, url: l.url })),
    restaurantName: nameFromSteelMeta(result.metadata, url, markdown),
  };
}

function toMenuScrape(page: ScrapedPage, restaurantName?: string): MenuScrape {
  return {
    markdown: page.markdown,
    source: 'scrape',
    restaurantName: restaurantName ?? page.restaurantName,
  };
}

function triedRow(page: ScrapedPage): ScrapeHop {
  return {
    url: page.url,
    chars: page.markdown.length,
    thin: scrapeLooksThin(page.markdown),
    score: scoreMenuMarkdown(page.markdown),
    markdown: page.markdown,
  };
}

/**
 * Tier 1 + menu discovery, then Playwright when the page is still thin (JS menus).
 * Always returns markdown — "not found" is the parser/API gate, not this function.
 */
export async function scrapeMenuDetailed(url: string): Promise<ScrapeTrace> {
  if (isMocked()) {
    const markdown = sampleMenuMarkdown();
    return {
      result: { markdown, source: 'scrape', restaurantName: 'Maison Ordinaire' },
      startUrl: url,
      chosenUrl: url,
      tried: [{ url, chars: markdown.length, thin: false, score: scoreMenuMarkdown(markdown), markdown }],
      candidates: [],
      generalUrl: url,
      generalMarkdown: markdown,
    };
  }

  const first = await scrapePage(url);
  const tried = [triedRow(first)];
  const seen = new Set<string>([normalizeUrl(first.url, first.url) ?? first.url]);
  const pages: ScrapedPage[] = [first];
  let bestMarkdown = first.markdown;
  let bestScore = scoreMenuMarkdown(first.markdown);
  let chosenUrl = first.url;
  const restaurantName = first.restaurantName ?? nameFromHost(url);
  let result: MenuScrape = toMenuScrape(first, restaurantName);
  const candidates: string[] = [];

  const consider = (page: ScrapedPage) => {
    pages.push(page);
    tried.push(triedRow(page));
    const score = scoreMenuMarkdown(page.markdown);
    if (score > bestScore) {
      bestMarkdown = page.markdown;
      bestScore = score;
      chosenUrl = page.url;
      result = toMenuScrape(page, restaurantName);
    }
  };

  const follow = async (hrefs: string[]) => {
    for (const next of hrefs) {
      const key = normalizeUrl(next, next) ?? next;
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push(next);
      try {
        consider(await scrapePage(next, isPdfUrl(next) ? 0 : 2500));
      } catch {
        tried.push({ url: next, chars: 0, thin: true, score: 0 });
      }
    }
  };

  if (scrapeLooksThin(first.markdown)) {
    await follow(menuCandidateUrls(first.url, first.links, first.markdown));
  }

  // Second hop: PDFs on the homepage AND on /menu we just opened (Mademoiselle).
  if (scrapeLooksThin(bestMarkdown)) {
    const pdfs: string[] = [];
    for (const page of pages) {
      if (isPdfUrl(page.url)) continue;
      for (const pdf of menuPdfUrls(page.url, page.links, page.markdown)) {
        if (!pdfs.includes(pdf)) pdfs.push(pdf);
      }
    }
    await follow(pdfs.slice(0, MAX_MENU_FOLLOWS));
  }

  if (scrapeLooksThin(bestMarkdown)) {
    const target = looksLikeHome(url)
      ? url
      : (candidates.find((c) => !isPdfUrl(c)) ?? (isPdfUrl(chosenUrl) ? undefined : chosenUrl));
    if (target) {
      try {
        const pw = await scrapeMenuWithBrowser(target, url);
        const score = scoreMenuMarkdown(pw.markdown);
        tried.push({
          url: `${target} [playwright]`,
          chars: pw.markdown.length,
          thin: scrapeLooksThin(pw.markdown),
          score,
          markdown: pw.markdown,
        });
        if (score > bestScore) {
          bestMarkdown = pw.markdown;
          bestScore = score;
          chosenUrl = target;
          result = { ...pw, restaurantName };
        }
      } catch (err) {
        tried.push({
          url: `${target} [playwright failed]`,
          chars: 0,
          thin: true,
          score: 0,
        });
        console.error('playwright scrape failed:', err instanceof Error ? err.message : err);
      }
    }
  }

  let generalUrl = looksLikeHome(first.url) ? first.url : undefined;
  let generalMarkdown = looksLikeHome(first.url) ? first.markdown : undefined;
  const home = siteHomeUrl(url);
  if (home && normalizeUrl(home, home) !== normalizeUrl(first.url, first.url)) {
    try {
      const general = await scrapePage(home);
      generalUrl = general.url;
      generalMarkdown = general.markdown;
      tried.push({
        ...triedRow(general),
        url: `${general.url} [general]`,
      });
      if (general.restaurantName && !PLATFORM_NAME.test(general.restaurantName)) {
        result = { ...result, restaurantName: general.restaurantName };
      }
    } catch {
      tried.push({ url: `${home} [general failed]`, chars: 0, thin: true, score: 0 });
    }
  } else if (!generalMarkdown) {
    generalUrl = first.url;
    generalMarkdown = first.markdown;
  }

  return {
    result,
    startUrl: url,
    chosenUrl,
    tried,
    candidates,
    generalUrl,
    generalMarkdown,
  };
}

export async function scrapeMenu(url: string): Promise<MenuScrape> {
  const { result } = await scrapeMenuDetailed(url);
  return result;
}

function cdpWebSocketUrl(websocketUrl: string): string {
  const u = new URL(websocketUrl);
  if (!u.searchParams.get('apiKey') && process.env.STEEL_API_KEY) {
    u.searchParams.set('apiKey', process.env.STEEL_API_KEY);
  }
  return u.toString();
}

async function dismissCookies(page: Page): Promise<void> {
  const pattern =
    /ok,\s*accept all|accept all|tout accepter|j['’]accepte|\baccepter\b|\bautoriser\b|allow all|i agree|\bagree\b/i;
  for (const frame of [page, ...page.frames()]) {
    const btn = frame
      .locator('button, a, [role="button"]')
      .filter({ hasText: pattern })
      .first();
    if (await btn.count()) {
      await btn.click({ timeout: 4000, force: true }).catch(() => undefined);
      await page.waitForTimeout(1_200);
      return;
    }
  }
}

async function expandMenuUi(page: Page): Promise<void> {
  const discover = page
    .getByText(/discover our menu|découvrir (la )?carte|voir (la )?carte|ver (la )?carta|speisekarte|メニューを見る|查看菜单/i)
    .first();
  if (await discover.count()) {
    await discover.click({ timeout: 3000, force: true }).catch(() => undefined);
    await page.waitForTimeout(800);
  }

  const menuNav = page
    .locator('a, button, [role="tab"], [role="link"]')
    .filter({ hasText: MENU_NAV_CLICK })
    .first();
  if (await menuNav.count()) {
    await menuNav.click({ timeout: 3000, force: true }).catch(() => undefined);
    await page.waitForTimeout(800);
  }
}

async function pageToMarkdown(page: Page): Promise<string> {
  const chunks: string[] = [];
  for (const frame of page.frames()) {
    const text = await frame
      .locator('body')
      .innerText({ timeout: 8_000 })
      .catch(() => '');
    if (text.trim()) chunks.push(text.trim());
  }
  const longest = chunks.sort((a, b) => b.length - a.length)[0] ?? '';
  return longest.replace(/\n{3,}/g, '\n\n');
}

async function loadAndRead(page: Page, url: string): Promise<string> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await dismissCookies(page);
  await expandMenuUi(page);
  await page
    .waitForFunction(
      () => /(?:[$£€]\s?\d|\d+[.,]\d{2}\s*(?:€|EUR)|STARTER|MAIN COURSE)/i.test(document.body?.innerText ?? ''),
      { timeout: 20_000 },
    )
    .catch(() => undefined);
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
  await page.waitForTimeout(1_500);
  return pageToMarkdown(page);
}

/** Tier 2. Create session -> connect playwright-core over CDP -> expand -> markdown. */
export async function scrapeMenuWithBrowser(
  url: string,
  homeUrl?: string,
): Promise<MenuScrape> {
  const client = steel();
  let sessionId: string | undefined;
  let browser: Awaited<ReturnType<typeof chromium.connectOverCDP>> | undefined;

  try {
    const session = await client.sessions.create(
      { timeout: SESSION_TIMEOUT_MS },
      { timeout: SESSION_TIMEOUT_MS },
    );
    sessionId = session.id;

    browser = await chromium.connectOverCDP(cdpWebSocketUrl(session.websocketUrl));
    const context = browser.contexts()[0] ?? (await browser.newContext());
    const page = context.pages()[0] ?? (await context.newPage());

    let markdown = await loadAndRead(page, url);
    if (scrapeLooksThin(markdown) && homeUrl && normalizeUrl(homeUrl, homeUrl) !== normalizeUrl(url, url)) {
      const fromHome = await loadAndRead(page, homeUrl);
      if (scoreMenuMarkdown(fromHome) > scoreMenuMarkdown(markdown)) {
        markdown = fromHome;
      }
    }

    const hrefs = await page
      .evaluate(() =>
        [...document.querySelectorAll('a[href]')].map((a) => {
          const el = a as HTMLAnchorElement;
          return { text: (el.innerText || el.getAttribute('aria-label') || '').trim(), url: el.href };
        }),
      )
      .catch(() => [] as Array<{ text: string; url: string }>);
    const pdfs = menuPdfUrls(page.url(), hrefs).length
      ? menuPdfUrls(page.url(), hrefs)
      : hrefs.map((l) => l.url).filter((u) => isPdfUrl(u) && MENU_SLUG.test(u));
    for (const pdfUrl of pdfs.slice(0, 1)) {
      try {
        const pdfText = await extractPdfText(pdfUrl);
        if (scoreMenuMarkdown(pdfText) > scoreMenuMarkdown(markdown)) {
          markdown = pdfText;
        }
      } catch {
        // keep HTML/JS extract
      }
    }

    return {
      markdown,
      source: 'playwright',
      sessionViewerUrl: session.sessionViewerUrl,
    };
  } finally {
    await browser?.close().catch(() => undefined);
    if (sessionId) {
      await client.sessions.release(sessionId).catch(() => undefined);
    }
  }
}
