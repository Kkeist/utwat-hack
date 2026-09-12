/**
 * OWNER: Workstream B (parsing, cache, scripts)
 *
 * Offline parser check. NO STEEL CALLS, no network, no key needed.
 * Run this after ANY change to lib/parse-menu.ts:  npm run probe
 *
 * It prints what the parser found against the hand-written expectation in
 * lib/fixtures. The two named regressions are checked explicitly — an unanchored
 * `fri` ate Steak Frites, an unanchored `tea` filed it as a beverage. (Design doc §8.)
 */
import { sampleMenuMarkdown, SAMPLE_DISHES } from '../lib/fixtures';
import { menuLooksReal, parseMenu } from '../lib/parse-menu';
import { classify } from '../lib/roulette';

const dishes = parseMenu(sampleMenuMarkdown());

console.log(`parsed ${dishes.length} dishes (expected ${SAMPLE_DISHES.length})`);
console.log(`menuLooksReal: ${menuLooksReal(dishes)}\n`);

for (const d of dishes) {
  console.log(`  ${classify(d).padEnd(8)} ${d.name}${d.price ? `  ${d.price}` : ''}`);
}

const expected = new Set(SAMPLE_DISHES.map((d) => d.name));
const got = new Set(dishes.map((d) => d.name));
const missing = [...expected].filter((n) => !got.has(n));
const extra = [...got].filter((n) => !expected.has(n));

if (missing.length) console.log(`\nMISSING (${missing.length}): ${missing.join(', ')}`);
if (extra.length) console.log(`\nEXTRA (${extra.length}): ${extra.join(', ')}`);

// Named regressions. These must never fail again.
const frites = dishes.find((d) => d.name === 'Steak Frites');
if (!frites) console.log('\nREGRESSION: Steak Frites vanished from the parse (unanchored `fri`?)');
else if (classify(frites) !== 'main') console.log(`\nREGRESSION: Steak Frites classified as ${classify(frites)} (unanchored \`tea\`?)`);

process.exit(missing.length || extra.length ? 1 : 0);
