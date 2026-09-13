// UI check: node scripts/screenshot.mjs <outDir> [label]
// Needs the dev server on http://localhost:3000 (start.bat). For desktop
// (1440), tablet (820) and phone (390): the entry page, the result page in
// full view, the compact view, the dish dialog, a search, and a mid-scroll
// viewport of the full view.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const outDir = process.argv[2];
const label = process.argv[3];
mkdirSync(outDir, { recursive: true });
const file = (part, size) => join(outDir, `${label ? `${label}-` : ''}${part}-${size}.png`);

// Headless launch with a temporary profile; Playwright removes it on close().
const browser = await chromium.launch({ headless: true });

const sizes = [
  ['desktop', 1440, 900],
  ['tablet', 820, 1100],
  ['phone', 390, 844],
];

for (const [name, w, h] of sizes) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: file('home', name), fullPage: true });

  // The URL field starts empty; fill it so the submit button becomes enabled.
  await page.fill('input[aria-label="Restaurant URL"]', 'https://example.com/menu');
  await page.click('button[type="submit"]');
  await page.waitForSelector('[data-results]', { timeout: 30000 });
  // Let the background lookups land before the full-view capture.
  await page.waitForTimeout(6000);
  await page.click('button[aria-pressed]:has-text("Full")');
  await page.waitForTimeout(300);
  await page.screenshot({ path: file('result-full', name), fullPage: true });

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.6));
  await page.waitForTimeout(400);
  await page.screenshot({ path: file('scrolled', name), fullPage: false });
  await page.evaluate(() => window.scrollTo(0, 0));

  await page.click('button[aria-pressed]:has-text("Compact")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: file('result-compact', name), fullPage: true });

  const tile = page.locator('[data-dish-tile]').nth(4);
  if (await tile.count()) {
    await tile.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: file('dialog', name), fullPage: false });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }

  await page.fill('input[type="search"]', 'duck');
  await page.waitForTimeout(400);
  await page.screenshot({ path: file('search', name), fullPage: true });
  await page.fill('input[type="search"]', '');

  // Ingredient filter: open it, type, pick the first match with Enter.
  await page.click('button[aria-controls]');
  await page.fill('input[aria-label="Type an ingredient"]', 'gar');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  await page.screenshot({ path: file('ingredients', name), fullPage: false });

  await page.close();
}
await browser.close();
console.log('done');
