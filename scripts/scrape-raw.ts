/**
 * Dump raw Steel markdown after tier 1 + menu discovery. No parse, no roulette.
 *
 *   npm run scrape-raw -- https://example.com
 *
 * Writes three files:
 *   .cache/menulist.md           the kept menu
 *   .cache/generalInfo.md         homepage general info (hours, address, about)
 *   .cache/review.md              reviews (Maps / Tabelog / OpenTable / TripAdvisor / TheFork / Yelp / DDG)
 *
 * Needs STEEL_API_KEY and MOCK_STEEL off (see .env.local).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { isMocked } from '../lib/steel';
import { scrapeLooksThin, scrapeMenuDetailed, type ScrapeTrace } from '../lib/scrape-menu';
import { reviewsFileMarkdown, scrapeReviews, findGoogleMapsUrl } from '../lib/scrape-reviews';

function isKept(rowUrl: string, chosenUrl: string): boolean {
  return rowUrl === chosenUrl || rowUrl.startsWith(`${chosenUrl} [playwright]`);
}

function nearFromUrl(pageUrl: string): string | undefined {
  try {
    const host = new URL(pageUrl).hostname.toLowerCase();
    if (host.endsWith('.paris') || host.includes('paris')) return 'Paris';
    if (host.endsWith('.tokyo.jp') || host.includes('tokyo')) return 'Tokyo';
    if (host.endsWith('.fr')) return 'Paris';
    if (host.endsWith('.jp')) return 'Tokyo';
  } catch {
    return undefined;
  }
  return undefined;
}

function generalMarkdown(trace: ScrapeTrace): string {
  const hops = trace.tried.map((row) => {
    const kept = isKept(row.url, trace.chosenUrl) ? ' ← menu' : '';
    return `- ${row.thin ? 'thin' : 'ok  '}  ${row.chars} chars  ${row.url}${kept}`;
  });

  return [
    `# General information — ${trace.result.restaurantName ?? '(unknown)'}`,
    '',
    `- home: ${trace.generalUrl ?? '(none)'}`,
    `- start: ${trace.startUrl}`,
    `- menu: ${trace.chosenUrl}`,
    `- source: ${trace.result.source}`,
    ...(trace.result.sessionViewerUrl ? [`- viewer: ${trace.result.sessionViewerUrl}`] : []),
    '',
    '## How we got here',
    '',
    ...hops,
    '',
    '## About, hours, address',
    '',
    (trace.generalMarkdown ?? '').trim() || '_no homepage content_',
    '',
  ].join('\n');
}

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error('usage: npm run scrape-raw -- <url>');
    process.exit(1);
  }

  if (isMocked()) {
    console.error('MOCK_STEEL is on (or STEEL_API_KEY missing). Set MOCK_STEEL=0 in .env.local.');
    process.exit(1);
  }

  console.log(`scraping ${url} …`);
  const trace = await scrapeMenuDetailed(url);
  const markdown = trace.result.markdown;

  const outDir = join(process.cwd(), '.cache');
  mkdirSync(outDir, { recursive: true });
  const menuFile = join(outDir, 'menulist.md');
  const pathFile = join(outDir, 'generalInfo.md');
  const reviewsFile = join(outDir, 'review.md');
  writeFileSync(menuFile, markdown, 'utf8');
  writeFileSync(pathFile, generalMarkdown(trace), 'utf8');

  console.log(`\n--- discovery ---`);
  console.log(`start:   ${trace.startUrl}`);
  console.log(`name:    ${trace.result.restaurantName ?? '(unknown)'}`);
  console.log(
    `candidates: ${trace.candidates.length ? trace.candidates.join('\n            ') : '(none)'}`,
  );
  for (const row of trace.tried) {
    const mark = isKept(row.url, trace.chosenUrl) ? '← kept' : '';
    console.log(
      `  ${row.thin ? 'thin' : 'ok  '}  score=${row.score.toFixed(1)}  ${row.chars} chars  ${row.url} ${mark}`,
    );
  }
  console.log(`chosen:  ${trace.chosenUrl}`);
  console.log(`source:  ${trace.result.source}`);
  if (trace.result.sessionViewerUrl) {
    console.log(`viewer:  ${trace.result.sessionViewerUrl}`);
  }
  console.log(`thin:    ${scrapeLooksThin(markdown)}`);
  console.log(`home:    ${trace.generalUrl ?? '(same as start)'}`);
  console.log(`menu:    ${menuFile}`);
  console.log(`general: ${pathFile}`);

  const name = trace.result.restaurantName;
  if (name) {
    const mapsUrl = findGoogleMapsUrl(trace.generalMarkdown ?? '');
    console.log(`\n--- reviews (${name}) ---`);
    if (mapsUrl) console.log(`maps:    ${mapsUrl}`);
    const reviews = await scrapeReviews(name, {
      mapsUrl,
      pageMarkdown: trace.generalMarkdown,
      near: nearFromUrl(url),
    });
    writeFileSync(reviewsFile, reviewsFileMarkdown(reviews), 'utf8');
    console.log(`source:  ${reviews.source}`);
    console.log(`search:  ${reviews.searchUrl}`);
    console.log(`reviews: ${reviewsFile} (${reviews.markdown.length} chars)`);
  } else {
    writeFileSync(
      reviewsFile,
      '# Reviews\n\nNo restaurant name — skipped review search.\n',
      'utf8',
    );
    console.log(`reviews: ${reviewsFile} (skipped — no restaurant name)`);
  }

  console.log(`\n--- menu markdown (first 4000 chars) ---\n`);
  console.log(markdown.slice(0, 4000));
  if (markdown.length > 4000) {
    console.log(`\n… truncated; full menu in ${menuFile}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
