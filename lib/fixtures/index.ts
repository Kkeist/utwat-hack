import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Dish, DishFacts } from '@/lib/types';

/**
 * Offline test data. Nothing here touches the network.
 *
 * The sample menu is deliberately nasty: a markdown table, `**Name** $12` lines,
 * em-dash lines, description-follows-price lines, priceless prix-fixe items, and
 * nav/footer junk. It also contains Steak Frites, which is the regression case
 * for the two unanchored-substring bugs (`fri`, `tea`) — see the design doc §8.
 */
export function sampleMenuMarkdown(): string {
  return readFileSync(join(process.cwd(), 'lib/fixtures/sample-menu.md'), 'utf8');
}

/**
 * Hand-written expected output of the parser on the sample menu.
 * Workstreams C and D develop against this so they never wait on the parser.
 * Workstream B: `npm run probe` checks the real parser against this shape.
 */
export const SAMPLE_DISHES: Dish[] = [
  { name: "Soupe à l'Oignon", price: '$14', priceValue: 14, description: 'Gratinéed with comté, baked overnight.', category: 'Starters' },
  { name: 'Escargots', price: '$16', priceValue: 16, description: 'six, in garlic butter, as they should be', category: 'Starters' },
  { name: 'Salade Frisée aux Lardons', price: '$13', priceValue: 13, description: 'Poached egg, bacon, mustard vinaigrette.', category: 'Starters' },
  { name: 'Caesar Salad', price: '$15', priceValue: 15, category: 'Starters' },
  { name: 'Steak Frites', price: '$34', priceValue: 34, description: "Bavette, maître d'hôtel butter, hand-cut fries", category: 'Mains' },
  { name: 'Duck Confit', price: '$31', priceValue: 31, description: 'Braised lentils, garlic sausage', category: 'Mains' },
  { name: 'Coq au Vin', price: '$29', priceValue: 29, description: 'Red wine, pearl onions, lardons', category: 'Mains' },
  { name: 'Sole Meunière', price: '$38', priceValue: 38, description: 'Brown butter, capers, lemon', category: 'Mains' },
  { name: 'Ratatouille', price: '$24', priceValue: 24, description: 'Summer vegetables, basil oil', category: 'Mains' },
  { name: 'Cassoulet', price: '$33', priceValue: 33, description: 'Toulouse sausage, duck, white beans. For two, ideally.', category: 'Mains' },
  { name: 'Steak Tartare', price: '$27', priceValue: 27, description: 'hand-cut, capers, cornichon, egg yolk', category: 'Mains' },
  { name: 'Tarte Tatin', price: '$12', priceValue: 12, description: 'Caramelised apple, crème fraîche.', category: 'Desserts' },
  { name: 'Crème Brûlée', price: '$11', priceValue: 11, category: 'Desserts' },
  { name: 'Profiteroles', price: '$13', priceValue: 13, description: 'chocolate sauce poured at the table', category: 'Desserts' },
  { name: 'Cheese Board', price: '$18', priceValue: 18, description: 'selection of five', category: 'Desserts' },
  { name: 'Sancerre', price: '$16', priceValue: 16, description: 'glass $16 / bottle $62', category: 'Wine & Drinks' },
  { name: 'Côtes du Rhône', price: '$13', priceValue: 13, description: 'glass $13 / bottle $48', category: 'Wine & Drinks' },
  { name: 'Kir Royale', price: '$15', priceValue: 15, category: 'Wine & Drinks' },
  { name: 'Espresso', price: '$4', priceValue: 4, category: 'Wine & Drinks' },
  { name: 'Mint Tea', price: '$6', priceValue: 6, category: 'Wine & Drinks' },
  { name: 'Soupe du Jour', category: 'Prix Fixe' },
  { name: 'Poulet Rôti', category: 'Prix Fixe' },
  { name: 'Îles Flottantes', category: 'Prix Fixe' },
];

/** Canned facts so the dish card can be styled without burning Steel calls. */
export const SAMPLE_FACTS: Record<string, DishFacts> = {
  'Duck Confit': {
    name: 'Duck Confit',
    description: 'Confit de canard is a French dish of duck leg cured in salt and slowly cooked in its own fat.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Confit_de_canard.jpg/640px-Confit_de_canard.jpg',
    searchUrl: 'https://www.google.com/search?q=Duck+Confit+dish',
    source: 'wikipedia',
  },
  'Steak Frites': {
    name: 'Steak Frites',
    description: 'Steak frites is a dish of steak paired with french fries, common in European restaurants.',
    searchUrl: 'https://www.google.com/search?q=Steak+Frites+dish',
    source: 'wikipedia',
  },
};
