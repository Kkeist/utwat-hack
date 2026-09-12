// UI check: node scripts/screenshot.mjs <outDir> [label]
// Needs the dev server on http://localhost:3000 (start.bat). Takes desktop
// (1440), tablet (820) and phone (390) shots of the entry page, the result
// page after submitting a URL, an expanded dish row, and a mid-scroll viewport.
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

  await page.fill('input[aria-label="Restaurant URL"]', 'https://example.com/menu');
  await page.click('button[type="submit"]');
  await page.waitForSelector('[data-results]', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: file('result', name), fullPage: true });
  // Expand the first menu row if present, then shoot the current viewport.
  // Viewport (not fullPage) shots are the only honest check for fixed
  // elements — Chromium's fullPage capture paints them once, at the top.
  const row = page.locator('[data-dish-row]').first();
  if (await row.count()) {
    await row.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: file('expanded', name), fullPage: false });
  }
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.6));
  await page.waitForTimeout(400);
  await page.screenshot({ path: file('scrolled', name), fullPage: false });
  await page.close();
}
await browser.close();
console.log('done');
