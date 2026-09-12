/**
 * OWNER: Workstream D (UI)
 *
 * Every string the interface shows, in one place. Components import from here
 * and never carry literal UI text of their own.
 */
export const copy = {
  brand: 'Dishly',
  restaurantTag: 'Restaurant',
  intro: "Paste a restaurant's website and wait for an easy-to-read list of its dishes.",
  about:
    'Dishly looks up every dish on the menu for you: what the name actually means, what food it is, and a reference photo, so you can find something you will like.',
  urlLabel: 'Restaurant URL',
  urlPlaceholder: 'Fill in the URL',
  partySize: 'Party size',
  search: 'Search',
  searching: 'Searching…',
  readingMenu: 'Reading the menu',
  suggestionsTitle: "Chef's suggestions",
  forTable: (partySize: number) =>
    partySize === 1 ? 'For a table of one' : `For a table of ${partySize}`,
  menuTitle: 'The menu',
  seat: (n: number) => `Seat ${n}`,
  shared: 'To share',
  lookItUp: 'Look it up',
  dishesRead: (count: number, path: string) =>
    `${count} ${count === 1 ? 'dish' : 'dishes'}, read with Steel ${path}.`,
  scrapePath: '/scrape',
  browserPath: 'session + Playwright',
  watchSession: 'Watch the session',
  madeBy: 'made by 404 Brain Not Found',
  genericError: 'Something went wrong.',
} as const;
