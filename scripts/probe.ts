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

const euro = parseMenu(`## Mains
Duck Confit 31€
Steak Frites 34 €
Sole Meunière €38
Cassoulet 33€
Ratatouille 24€
Coq au Vin 29 €
`);
if (euro.length < 6 || !menuLooksReal(euro)) {
  console.log(`\nREGRESSION: euro prices parsed ${euro.length} dishes, real=${menuLooksReal(euro)}`);
  process.exit(1);
}

const stacked = parseMenu(`## Le Petit Déjeuner
Soft-Boiled Egg*
with Parmesan and multigrain soldiers
8.00

Steel-Cut Irish Oatmeal
with poached fruits
14.00

Eggs Benedict*
poached eggs, Canadian bacon and hollandaise
19.00

Avocado and Poached Eggs on Toast*
26.00

Steak and Eggs*
34.00
`);
if (stacked.length < 5 || !menuLooksReal(stacked) || !stacked.some((d) => d.name === 'Soft-Boiled Egg')) {
  console.log(`\nREGRESSION: stacked prices parsed ${stacked.length}: ${stacked.map((d) => d.name).join(', ')}`);
  process.exit(1);
}

const italicDesc = parseMenu(`## Le Petit Déjeuner
Soft-Boiled Egg\\*
*with Parmesan and soldiers*
8.00

Steel-Cut Irish Oatmeal
*with poached fruits*
14.00

Eggs Benedict\\*
*poached eggs and hollandaise*
19.00

Avocado Toast\\*
*with lemon-herb dressing*
26.00

Steak and Eggs\\*
*grilled petit tender*
34.00
`);
if (
  italicDesc.length < 5 ||
  italicDesc[0]?.name !== 'Soft-Boiled Egg' ||
  italicDesc.some((d) => d.name.startsWith('with ') || d.name.startsWith('*'))
) {
  console.log(`\nREGRESSION: italic descriptions parsed as names: ${italicDesc.map((d) => d.name).join(', ')}`);
  process.exit(1);
}

const pdfBold = parseMenu(`**Entrées**
**Soupe à l'Oignon de ma mamie 20**
Grandma soup
**Escargots poêlés 21**
Snails
**Terrine Maison 19**
Terrine
**Tartare de Truite 24**
Trout
**Foie Gras 31**
Foie
**Plats**
**Bœuf Bourguignon 33**
Beef
`);
const onion = pdfBold.find((d) => /soupe/i.test(d.name));
if (!onion || onion.name.includes('20') || onion.price !== '20' || pdfBold.length < 5) {
  console.log(`\nREGRESSION: pdf bold prices: ${pdfBold.map((d) => `${d.name}|${d.price}`).join(' ; ')}`);
  process.exit(1);
}

process.exit(missing.length || extra.length ? 1 : 0);
