/**
 * OWNER: Workstream A (Steel plumbing)
 *
 * Restaurant reviews from several sources. Google Search often captchas Steel
 * IPs — skip that page and try Maps (if the site linked it), the restaurant's
 * own /reviews page, TripAdvisor, TheFork, Yelp, Tabelog, OpenTable,
 * DuckDuckGo (then follow the first real review link), then quotes already
 * on the restaurant homepage.
 */
import { chromium, type Page } from 'playwright-core';
import { SESSION_TIMEOUT_MS, steel, steelApiKey } from '@/lib/steel';
import type { ScrapeSource } from '@/lib/types';

export interface ReviewScrape {
  name: string;
  searchUrl: string;
  markdown: string;
  source: ScrapeSource;
  sessionViewerUrl?: string;
}

const MAX_REVIEW_HOPS = 10;

const REVIEW_HOSTS =
  /tripadvisor|thefork|lafourchette|yelp\.com|opentable|tabelog|theinfatuation|maps\.google|google\.[^/]+\/maps|maps\.app\.goo\.gl/i;

export function findGoogleMapsUrl(markdown: string): string | undefined {
  return extractHttpUrls(markdown).find(isGoogleMapsUrl);
}

export function findReviewSiteUrls(markdown: string): string[] {
  const out: string[] = [];
  for (const href of extractHttpUrls(markdown).map(unwrapRedirect)) {
    if (!isReviewPageUrl(href) && !(REVIEW_HOSTS.test(href) && !isJunkReviewUrl(href))) continue;
    if (!out.includes(href)) out.push(href);
  }
  return out.sort((a, b) => scoreReviewPage(b) - scoreReviewPage(a));
}

function extractHttpUrls(markdown: string): string[] {
  const text = markdown.replace(/\\_/g, '_');
  const hrefs = [
    ...text.matchAll(/https?:\/\/[^\s)\]>'"]+/gi),
    ...text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g),
    ...text.matchAll(/src="([^"]+)"/gi),
  ].map((m) => (m[1] ?? m[0]).replace(/&amp;/g, '&'));
  return hrefs;
}

function unwrapRedirect(href: string): string {
  try {
    const u = new URL(href);
    const nested = u.searchParams.get('uddg') ?? u.searchParams.get('url');
    if (nested && /^https?:/i.test(nested)) return unwrapRedirect(nested);
    return href;
  } catch {
    return href;
  }
}

function isGoogleMapsUrl(href: string): boolean {
  try {
    const u = new URL(href);
    const host = u.hostname.replace(/^www\./i, '').toLowerCase();
    if (host === 'maps.app.goo.gl') return true;
    if (host === 'goo.gl' && u.pathname.startsWith('/maps')) return true;
    return (
      (host === 'google.com' || host === 'maps.google.com' || host.endsWith('.google.com')) &&
      /\/maps\b/i.test(`${u.pathname}${u.search}`)
    );
  } catch {
    return false;
  }
}

function isJunkReviewUrl(href: string): boolean {
  return /zenchef|wix\.com|captcha|duckduckgo\.com\/t\//i.test(href);
}

function isGoogleSearchUrl(href: string): boolean {
  try {
    const u = new URL(href);
    return /google\./i.test(u.hostname) && u.pathname.startsWith('/search');
  } catch {
    return false;
  }
}

function looksLikeSerp(href: string): boolean {
  try {
    const u = new URL(href);
    const host = u.hostname.replace(/^www\./i, '').toLowerCase();
    const path = `${u.pathname}${u.search}`;
    if (host.includes('duckduckgo.com')) return true;
    if (host.includes('tripadvisor') && /\/search/i.test(path)) return true;
    if (host.includes('yelp.') && /^\/search/i.test(u.pathname)) return true;
    if ((host.includes('thefork') || host.includes('lafourchette')) && /search/i.test(path)) {
      return true;
    }
    if (host.includes('tabelog') && /\/rstLst/i.test(path)) return true;
    if (host.includes('opentable') && /^\/s\/?/i.test(u.pathname)) return true;
    return isGoogleSearchUrl(href);
  } catch {
    return false;
  }
}

function isReviewPageUrl(href: string): boolean {
  try {
    const u = new URL(unwrapRedirect(href));
    const host = u.hostname.replace(/^www\./i, '').toLowerCase();
    const path = `${u.pathname}${u.search}`;
    if (isJunkReviewUrl(href) || looksLikeSerp(href) || isGoogleSearchUrl(href)) return false;
    if (host.includes('tripadvisor') && /Restaurant_Review|ShowUserReviews/i.test(path)) return true;
    if (host.includes('yelp.') && /\/biz\//i.test(u.pathname) && !/[?&]start=/i.test(path)) return true;
    if ((host.includes('thefork') || host.includes('lafourchette')) && /\/restaurant/i.test(path)) {
      return true;
    }
    if (host.includes('opentable.') && /\/r\//i.test(u.pathname)) return true;
    if (host.includes('theinfatuation.com') && /\/reviews\//i.test(u.pathname)) return true;
    if (host.includes('tabelog.') && /\/A\d+\/A\d+\/\d+/i.test(u.pathname)) return true;
    if (/\/reviews?\b/i.test(u.pathname)) return true;
    if (isGoogleMapsUrl(href)) return true;
    return false;
  } catch {
    return false;
  }
}

function tripadvisorRestaurantUrl(href: string): string | undefined {
  const text = unwrapRedirect(href).replace(/\\_/g, '_');
  const withReviews = text.match(
    /(?:Restaurant_Review|ShowUserReviews)-g(\d+)-d(\d+)(?:-r\d+)?-Reviews(?:-or\d+)?(?:-([^/?#.]+(?:-[^/?#.]+)*))?/i,
  );
  const showUser = text.match(
    /ShowUserReviews-g(\d+)-d(\d+)-r\d+-([^/?#.]+(?:-[^/?#.]+)*)/i,
  );
  const m = withReviews ?? showUser;
  if (!m?.[1] || !m[2]) return undefined;
  const slug = (m[3] ?? '').replace(/\.html$/i, '');
  const tail = slug ? `-${slug}` : '';
  return `https://www.tripadvisor.com/Restaurant_Review-g${m[1]}-d${m[2]}-Reviews${tail}.html`;
}

function tripadvisorRestaurantUrlsFrom(markdown: string): string[] {
  const text = markdown.replace(/\\_/g, '_');
  const out: string[] = [];
  const seen = new Set<string>();
  const patterns = [
    /(?:Restaurant_Review|ShowUserReviews)-g\d+-d\d+(?:-r\d+)?-Reviews(?:-or\d+)?(?:-[^/?#.\s]+(?:-[^/?#.\s]+)*)?/gi,
    /ShowUserReviews-g\d+-d\d+-r\d+-[^/?#.\s]+(?:-[^/?#.\s]+)*/gi,
  ];
  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      const url = tripadvisorRestaurantUrl(m[0]);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      out.push(url);
    }
  }
  return out;
}

function scoreReviewPage(href: string): number {
  const u = unwrapRedirect(href).toLowerCase();
  if (/\/reviews?\b/.test(u) && !/yelp|tripadvisor|thefork|lafourchette|opentable|tabelog/.test(u)) {
    return 95;
  }
  if (/tripadvisor[^/]*\/restaurant_review/i.test(u)) return 90;
  if (/tabelog\.[^/]+\/.*\/dtlrvwlst/i.test(u)) return 88;
  if (/tabelog\.[^/]+\/.*\/A\d+\/A\d+\/\d+/i.test(u)) return 86;
  if (/yelp\.[^/]+\/biz\//.test(u)) return 80;
  if (/thefork|lafourchette/.test(u)) return 75;
  if (/opentable/.test(u)) return 70;
  if (/theinfatuation/.test(u)) return 60;
  if (isGoogleMapsUrl(u)) return 40;
  return 10;
}

function tabelogArea(near?: string): string | undefined {
  if (!near) return undefined;
  const n = near.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  if (/paris|ile-de-france|ile de france/.test(n)) return 'paris';
  if (/tokyo|東京/.test(n)) return 'tokyo';
  if (/osaka|大阪/.test(n)) return 'osaka';
  if (/kyoto|京都/.test(n)) return 'kyoto';
  if (/seoul|korea/.test(n)) return 'seoul';
  return undefined;
}

function tabelogSearchUrl(name: string, near?: string): string {
  const area = tabelogArea(near);
  const sk = encodeURIComponent(name);
  if (area) return `https://tabelog.com/en/${area}/rstLst/?vs=1&sk=${sk}`;
  const q = near ? `${name} ${near}` : name;
  return `https://tabelog.com/en/rstLst/?vs=1&sk=${encodeURIComponent(q)}`;
}

function tabelogUrlFitsNear(href: string, near?: string): boolean {
  const area = tabelogArea(near);
  if (!area || !/tabelog/i.test(href)) return true;
  try {
    const path = new URL(unwrapRedirect(href)).pathname.toLowerCase();
    if (path.includes(`/${area}/`)) return true;
    return !/\/(tokyo|osaka|kyoto|fukuoka|hokkaido|nagoya|yokohama|kobe|sendai|sapporo|okinawa|seoul|taipei|shanghai)\//i.test(
      path,
    );
  } catch {
    return true;
  }
}

function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4 && !/^(les?|the|restaurant|cafe|bistro|paris|tokyo)$/.test(t));
}

function pageMatchesName(markdown: string, name: string): boolean {
  const tokens = nameTokens(name);
  if (!tokens.length) return true;
  const text = markdown
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  const distinctive = tokens.filter((t) => t.length >= 5);
  const needed = distinctive.length ? distinctive : tokens;
  return needed.every((t) => text.includes(t));
}

function tabelogReviewsUrl(href: string): string | undefined {
  try {
    const parsed = new URL(unwrapRedirect(href));
    if (!parsed.hostname.includes('tabelog')) return undefined;
    if (/dtlrvwlst/i.test(parsed.pathname)) return parsed.toString();
    const shop = parsed.pathname.match(/^(.*\/A\d+\/A\d+\/\d+)\/?$/i);
    if (!shop?.[1]) return undefined;
    parsed.pathname = `${shop[1]}/dtlrvwlst/`;
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return undefined;
  }
}

function urlMatchesName(href: string, name: string): boolean {
  const tokens = nameTokens(name);
  if (!tokens.length) return true;
  let hay = href.toLowerCase();
  try {
    hay = decodeURIComponent(href).toLowerCase();
  } catch {
    // keep raw
  }
  hay = hay.normalize('NFD').replace(/\p{M}/gu, '');
  const distinctive = tokens.filter((t) => t.length >= 5);
  const needed = distinctive.length ? distinctive : tokens;
  return needed.some((t) => hay.includes(t));
}

function hrefContextMatchesName(markdown: string, href: string, name: string): boolean {
  if (urlMatchesName(href, name)) return true;
  const idx = markdown.indexOf(href);
  if (idx < 0) return false;
  const window = markdown.slice(Math.max(0, idx - 280), idx + href.length + 120);
  return pageMatchesName(window, name);
}

function extractFollowUrls(markdown: string, near?: string, name?: string): string[] {
  const unique: string[] = [];
  const seenPath = new Set<string>();
  const rawLinks = [
    ...tripadvisorRestaurantUrlsFrom(markdown),
    ...extractHttpUrls(markdown).map(unwrapRedirect),
  ];
  for (const raw of rawLinks) {
    const candidates = [raw, tabelogReviewsUrl(raw), tripadvisorRestaurantUrl(raw)].filter(
      (u): u is string => Boolean(u),
    );
    for (const href of candidates) {
      if (!isReviewPageUrl(href) || !tabelogUrlFitsNear(href, near)) continue;
      if (name && !hrefContextMatchesName(markdown, raw, name) && !urlMatchesName(href, name)) {
        continue;
      }
      const key = href.split('?')[0]?.toLowerCase() ?? href;
      if (seenPath.has(key)) continue;
      seenPath.add(key);
      unique.push(href);
    }
  }
  return unique.sort((a, b) => scoreReviewPage(b) - scoreReviewPage(a)).slice(0, 6);
}

export function reviewSearchUrls(name: string, near?: string): string[] {
  const q = near ? `${name} ${near}` : name;
  const encoded = encodeURIComponent(`${q} restaurant reviews`);
  const ta = encodeURIComponent(`${q} site:tripadvisor.com`);
  return [
    `https://html.duckduckgo.com/html/?q=${ta}`,
    `https://html.duckduckgo.com/html/?q=${encoded}`,
    `https://www.tripadvisor.com/Search?q=${encodeURIComponent(q)}`,
    `https://www.thefork.com/search/?text=${encodeURIComponent(q)}`,
    `https://www.yelp.com/search?find_desc=${encodeURIComponent(q)}`,
    `https://www.opentable.com/s?term=${encodeURIComponent(q)}`,
    tabelogSearchUrl(name, near),
  ];
}

function reviewsLookBlocked(markdown: string): boolean {
  const text = markdown.trim();
  if (text.length < 280) return true;
  if (/unusual traffic|captcha|are you a robot|enable javascript|before you continue to google|pardon our interruption|verify you are a human/i.test(text)) {
    return true;
  }
  return false;
}

function reviewsLookUseful(markdown: string): boolean {
  if (reviewsLookBlocked(markdown)) return false;
  return /\breviews?\b|\bavis\b|\bstars?\b|★|⭐|\d\.\d\s*\/\s*5|tripadvisor|thefork|yelp|tabelog|食べログ|口コミ|opentable|“.{20,}”|".{20,}"/i.test(
    markdown,
  );
}

function homepageQuotes(markdown: string): string {
  const quotes = [...markdown.matchAll(/[“"]([^”"]{40,400})[”"]\s*(?:—|-)?\s*([A-Z][^\n]{0,60})?/g)];
  if (!quotes.length) return '';
  return quotes
    .slice(0, 8)
    .map((m) => `> ${m[1].trim()}${m[2] ? `\n\n— ${m[2].trim()}` : ''}`)
    .join('\n\n');
}

function cdpWebSocketUrl(websocketUrl: string): string {
  const u = new URL(websocketUrl);
  const key = steelApiKey();
  if (!u.searchParams.get('apiKey') && key) {
    u.searchParams.set('apiKey', key);
  }
  return u.toString();
}

async function acceptConsent(page: Page): Promise<void> {
  const btn = page
    .locator('button, a, [role="button"]')
    .filter({ hasText: /accept all|tout accepter|i agree|agree|accept/i })
    .first();
  if (await btn.count()) {
    await btn.click({ timeout: 4000, force: true }).catch(() => undefined);
    await page.waitForTimeout(800);
  }
}

async function scrapeReviewsWithBrowser(url: string): Promise<Omit<ReviewScrape, 'name' | 'searchUrl'>> {
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

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await acceptConsent(page);
    await page.waitForTimeout(2_000);

    const chunks: string[] = [];
    for (const frame of page.frames()) {
      const text = await frame.locator('body').innerText({ timeout: 8_000 }).catch(() => '');
      if (text.trim()) chunks.push(text.trim());
    }
    const markdown = (chunks.sort((a, b) => b.length - a.length)[0] ?? '').replace(/\n{3,}/g, '\n\n');

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

async function scrapeMarkdown(url: string): Promise<string> {
  const result = await steel().scrape({ url, format: ['markdown'], delay: 1200 });
  return result.content.markdown ?? '';
}

function skipPlaywright(url: string): boolean {
  return isGoogleSearchUrl(url) || isGoogleMapsUrl(url) || looksLikeSerp(url);
}

async function tryScrape(
  url: string,
  name?: string,
): Promise<{ markdown: string; source: ScrapeSource; sessionViewerUrl?: string } | undefined> {
  try {
    const markdown = await scrapeMarkdown(url);
    if (
      reviewsLookUseful(markdown) &&
      !looksLikeSerp(url) &&
      (!name || pageMatchesName(markdown, name))
    ) {
      return { markdown, source: 'scrape' };
    }
  } catch {
    // next
  }
  if (skipPlaywright(url)) return undefined;

  try {
    const pw = await scrapeReviewsWithBrowser(url);
    if (reviewsLookUseful(pw.markdown) && (!name || pageMatchesName(pw.markdown, name))) return pw;
  } catch {
    // next
  }
  return undefined;
}

export async function scrapeReviews(
  name: string,
  opts?: { mapsUrl?: string; pageMarkdown?: string; near?: string },
): Promise<ReviewScrape> {
  const onPage = opts?.pageMarkdown ?? '';
  const fromSite = findReviewSiteUrls(onPage);
  const mapsUrl = opts?.mapsUrl ?? findGoogleMapsUrl(onPage);
  const queue = [
    ...(mapsUrl ? [mapsUrl] : []),
    ...fromSite,
    ...reviewSearchUrls(name, opts?.near),
  ].filter((u, i, all) => all.indexOf(u) === i);

  const seen = new Set<string>();
  let hops = 0;

  while (queue.length && hops < MAX_REVIEW_HOPS) {
    const url = queue.shift();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    hops += 1;

    if (looksLikeSerp(url) || isGoogleSearchUrl(url)) {
      let serp = '';
      try {
        serp = await scrapeMarkdown(url);
      } catch {
        // JS search pages often block /scrape — browser next
      }
      let follow = reviewsLookBlocked(serp)
        ? []
        : extractFollowUrls(serp, opts?.near, name).filter((u) => !seen.has(u));
      const useBrowser =
        !follow.length &&
        !/duckduckgo/i.test(url) &&
        /tripadvisor\.(com|co\.|fr)|tabelog|opentable\.com/i.test(url);
      if (useBrowser) {
        try {
          serp = (await scrapeReviewsWithBrowser(url)).markdown;
          follow = extractFollowUrls(serp, opts?.near, name).filter((u) => !seen.has(u));
        } catch {
          follow = [];
        }
      }
      if (follow.length) queue.unshift(...follow);
      continue;
    }

    const hit = await tryScrape(url, name);
    if (hit) {
      const quotes = homepageQuotes(onPage);
      const markdown = quotes
        ? `${hit.markdown.trim()}\n\n## From the restaurant site\n\n${quotes}`
        : hit.markdown;
      return {
        name,
        searchUrl: url,
        markdown,
        source: hit.source,
        sessionViewerUrl: hit.sessionViewerUrl,
      };
    }
  }

  const quotes = homepageQuotes(onPage);
  if (quotes) {
    return {
      name,
      searchUrl: '(homepage testimonials)',
      markdown: quotes,
      source: 'scrape',
    };
  }

  return {
    name,
    searchUrl: queue[0] ?? [...seen][0] ?? '',
    source: 'scrape',
    markdown: [
      `Could not load reviews for ${name}. Google blocked the request; TripAdvisor / TheFork / Yelp / Tabelog / OpenTable / DuckDuckGo also returned nothing useful.`,
      '',
      'Tried:',
      ...[...seen].map((u) => `- ${u}`),
      '',
    ].join('\n'),
  };
}

export function reviewsFileMarkdown(reviews: ReviewScrape): string {
  return [
    `# Reviews — ${reviews.name}`,
    '',
    `- source url: ${reviews.searchUrl}`,
    `- via: ${reviews.source}`,
    ...(reviews.sessionViewerUrl ? [`- viewer: ${reviews.sessionViewerUrl}`] : []),
    '',
    '## Reviews',
    '',
    reviews.markdown.trim() || '_no reviews extracted_',
    '',
  ].join('\n');
}
