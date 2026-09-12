/**
 * OWNER: Workstream B (parsing, cache, scripts)
 *
 * Pre-warm the disk cache the night before judging. Every dish looked up here is
 * a lookup the demo does not pay for on stage. (Design doc §4, §10.)
 *
 *   npm run warm -- https://restaurant-one.example https://restaurant-two.example
 *
 * Needs STEEL_API_KEY. Costs real calls — that is the point.
 */
import { scrapeMenu } from '../lib/scrape-menu';
import { menuLooksReal, parseMenu } from '../lib/parse-menu';
import { lookupDishes } from '../lib/dish-lookup';
import { cacheStats } from '../lib/cache';

const urls = process.argv.slice(2);
if (!urls.length) {
  console.error('usage: npm run warm -- <url> [url…]');
  process.exit(1);
}

for (const url of urls) {
  try {
    const scraped = await scrapeMenu(url);
    const dishes = parseMenu(scraped.markdown);
    console.log(`${url}\n  ${dishes.length} dishes via ${scraped.source}, real=${menuLooksReal(dishes)}`);

    // TODO(B): batch in chunks rather than one Promise.all over a 60-dish menu.
    await lookupDishes(dishes);
    console.log('  warmed');
  } catch (err) {
    console.error(`  FAILED: ${err instanceof Error ? err.message : err}`);
  }
}

console.log('\n', await cacheStats());
