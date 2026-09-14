// Alignment check: node scripts/check-alignment.mjs
// Needs the dev server on http://localhost:36880 (start.bat).
//
// Measures, with getBoundingClientRect() and computed style, instead of
// eyeballing screenshots: every menu-card's left edge and padding, every
// outlined button/toggle's height, and the shared field height. Prints a
// mismatch table; exits 1 if anything does not match its group's mode.
import { chromium } from 'playwright-core';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:36880/', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);

// The URL field starts empty; fill it so the submit button becomes enabled.
await page.fill('input[aria-label="Restaurant URL"]', 'https://example.com/menu');
await page.click('button[type="submit"]');
await page.waitForSelector('[data-results]', { timeout: 30000 });
await page.waitForTimeout(6000);

const report = await page.evaluate(() => {
  const round = (n) => Math.round(n * 100) / 100;

  function group(selector, measure) {
    const els = Array.from(document.querySelectorAll(selector));
    return els.map((el) => ({ el, value: measure(el) }));
  }

  function checkGroup(name, selector, measure) {
    const rows = group(selector, measure);
    if (rows.length < 2) return { name, count: rows.length, mismatches: [] };
    const counts = new Map();
    for (const r of rows) counts.set(r.value, (counts.get(r.value) ?? 0) + 1);
    const mode = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const mismatches = rows
      .filter((r) => r.value !== mode)
      .map((r) => ({ text: (r.el.textContent || '').trim().slice(0, 40), expected: mode, actual: r.value }));
    return { name, count: rows.length, expected: mode, mismatches };
  }

  const padLeft = (el) => round(parseFloat(getComputedStyle(el).paddingLeft));
  const height = (el) => round(el.getBoundingClientRect().height);
  const left = (el) => round(el.getBoundingClientRect().left);

  return [
    checkGroup('menu-card left padding', '.menu-card', padLeft),
    checkGroup('menu-card left edge (should all line up in one column)', '.menu-card', left),
    checkGroup('outlined buttons/toggles height (min-h-11 = 44px)', 'button[aria-pressed], a.inline-flex, button.inline-flex', height),
    checkGroup('text field height', '.field', height),
  ];
});

console.log('\nAlignment check (1440px, after Chef\'s suggestions load)\n');
let failed = false;
for (const g of report) {
  if (g.count < 2) {
    console.log(`  ${g.name}: only ${g.count} element(s), nothing to compare`);
    continue;
  }
  if (!g.mismatches.length) {
    console.log(`  OK  ${g.name}: ${g.count} elements, all ${g.expected}px`);
  } else {
    failed = true;
    console.log(`  FAIL ${g.name}: expected ${g.expected}px, ${g.mismatches.length} off`);
    for (const m of g.mismatches) console.log(`       "${m.text}" -> ${m.actual}px`);
  }
}

await browser.close();
process.exit(failed ? 1 : 0);
