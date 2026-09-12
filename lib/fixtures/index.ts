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

/** Same shape lib/dish-lookup builds; kept local to avoid an import cycle. */
const search = (name: string) => `https://www.google.com/search?q=${encodeURIComponent(`${name} dish`)}`;

/**
 * Canned facts so the dish cards can be styled without burning Steel calls.
 * Opening sentence and lead photo of each dish's Wikipedia article, as the
 * live lookup would return them. Dishes not listed here fall back to the
 * menu's own description and a search link.
 */
export const SAMPLE_FACTS: Record<string, DishFacts> = {
  'Soupe à l\'Oignon': {
    name: 'Soupe à l\'Oignon',
    description: 'French onion soup is a soup of onions which are sautéed and then cooked in meat stock or water, usually served gratinéed with croutons or a larger piece of bread covered with cheese floating on top.',
    photoUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5a/Soupe_%C3%A0_l%27oignon.jpg/960px-Soupe_%C3%A0_l%27oignon.jpg',
    searchUrl: search('Soupe à l\'Oignon'),
    source: 'wikipedia',
  },
  'Escargots': {
    name: 'Escargots',
    description: 'Snails are eaten by humans in many areas such as Africa, Southeast Asia and Mediterranean Europe, while in other cultures, snails are seen as a taboo food.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d7/Caracoles-del-restaurante-granero.jpg',
    searchUrl: search('Escargots'),
    source: 'wikipedia',
  },
  'Caesar Salad': {
    name: 'Caesar Salad',
    description: 'A Caesar salad, also known as Caesar\'s salad, is a green salad of romaine lettuce and croutons commonly dressed with lemon juice, olive oil, eggs, Worcestershire sauce, anchovies, garlic, Dijon mustard, Parmesan and black pepper.',
    photoUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/23/Caesar_salad_%282%29.jpg/960px-Caesar_salad_%282%29.jpg',
    searchUrl: search('Caesar Salad'),
    source: 'wikipedia',
  },
  'Steak Frites': {
    name: 'Steak Frites',
    description: 'Steak frites, meaning "steak [and] chipped potatoes" in French, is a dish consisting of beefsteak accompanied by fried chipped potatoes.',
    photoUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9a/Reel_and_Brand_-_September_2021_-_Sarah_Stierch_05.jpg/960px-Reel_and_Brand_-_September_2021_-_Sarah_Stierch_05.jpg',
    searchUrl: search('Steak Frites'),
    source: 'wikipedia',
  },
  'Duck Confit': {
    name: 'Duck Confit',
    description: 'Duck confit is a French dish made with whole duck.',
    photoUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/60/Confitdecanard.jpg/960px-Confitdecanard.jpg',
    searchUrl: search('Duck Confit'),
    source: 'wikipedia',
  },
  'Coq au Vin': {
    name: 'Coq au Vin',
    description: 'Coq au vin is a French dish of chicken braised with wine, lardons, mushrooms, and optionally garlic.',
    photoUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5a/Gourmet_coq_au_vin.jpg/960px-Gourmet_coq_au_vin.jpg',
    searchUrl: search('Coq au Vin'),
    source: 'wikipedia',
  },
  'Sole Meunière': {
    name: 'Sole Meunière',
    description: 'Sole meunière is a classic French fish dish consisting of sole – floured and fried – and served with hot melted butter, lemon juice, and parsley.',
    photoUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0d/Sole_meuniere_%284689490702%29.jpg/960px-Sole_meuniere_%284689490702%29.jpg',
    searchUrl: search('Sole Meunière'),
    source: 'wikipedia',
  },
  'Ratatouille': {
    name: 'Ratatouille',
    description: 'Ratatouille is a traditional French vegetable dish originating in the Provence region of southern France, particularly associated with Nice and its surrounding region.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/37/Ratatouille_home_cooked.jpg',
    searchUrl: search('Ratatouille'),
    source: 'wikipedia',
  },
  'Cassoulet': {
    name: 'Cassoulet',
    description: 'Cassoulet is a rich stew originating in southern France.',
    photoUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a5/Bowl_of_cassoulet.JPG/960px-Bowl_of_cassoulet.JPG',
    searchUrl: search('Cassoulet'),
    source: 'wikipedia',
  },
  'Steak Tartare': {
    name: 'Steak Tartare',
    description: 'Steak tartare, or tartar steak, is a French dish of raw ground (minced) beef.',
    photoUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/db/Classic_steak_tartare.jpg/960px-Classic_steak_tartare.jpg',
    searchUrl: search('Steak Tartare'),
    source: 'wikipedia',
  },
  'Tarte Tatin': {
    name: 'Tarte Tatin',
    description: 'The tarte Tatin is a tart in which the fruit is caramelized in butter and sugar before the tart is baked.',
    photoUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/16/Franse_tarte_tatin.jpg/960px-Franse_tarte_tatin.jpg',
    searchUrl: search('Tarte Tatin'),
    source: 'wikipedia',
  },
};
