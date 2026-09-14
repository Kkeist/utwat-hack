'use client';
/**
 * OWNER: Workstream D (UI)
 *
 * The result page. This portfolio deploy has no backend, so it always shows
 * the same fixed example menu (lib/fixtures/demo-response.ts) instead of
 * scraping the URL the user typed. Search is a client-side filter over the
 * loaded list — name, the menu's line, course, ingredients, description —
 * with accents ignored. The view choice is remembered in the browser.
 */
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { Dish } from '@/lib/types';
import { copy } from '../copy';
import { DEMO_MENU_RESPONSE } from '@/lib/fixtures/demo-response';
import { Card, SectionTitle } from './Card';
import { ButtonLink, SearchField, ToggleGroup } from './controls';
import { DishDetail } from './DishDetail';
import { IngredientFilter, type IngredientMode } from './IngredientFilter';
import { Header } from './Header';
import { DishGrid, MenuList, type MenuView as View } from './MenuList';
import { Modal } from './Modal';
import { Provenance } from './Provenance';
import { Skeleton } from './Skeleton';

/**
 * The remembered view, as an external store so the server renders 'full'
 * and the browser swaps in the saved choice without a hydration mismatch.
 */
const VIEW_KEY = 'dishly.view';
const viewListeners = new Set<() => void>();
function readView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'compact' ? 'compact' : 'full';
  } catch {
    return 'full';
  }
}
function writeView(view: View) {
  try {
    localStorage.setItem(VIEW_KEY, view);
  } catch {}
  viewListeners.forEach((l) => l());
}
function subscribeView(listener: () => void) {
  viewListeners.add(listener);
  return () => viewListeners.delete(listener);
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Lowercase, accents stripped: "Crème" and "creme" match each other. */
function plain(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** The one result this deploy ever shows — see lib/fixtures/demo-response.ts. */
const result = DEMO_MENU_RESPONSE;
const facts = DEMO_MENU_RESPONSE.facts;
const partySize = DEMO_MENU_RESPONSE.partySize;

/** Every ingredient any looked-up dish has, once (case-insensitive), alphabetical. */
const ingredientOptions = (() => {
  const all = new Map<string, string>();
  for (const f of Object.values(facts)) {
    for (const i of f.ingredients ?? []) {
      if (!all.has(plain(i))) all.set(plain(i), i.charAt(0).toUpperCase() + i.slice(1));
    }
  }
  return Array.from(all.values()).sort((a, b) => a.localeCompare(b));
})();

export function MenuView() {
  const [searchText, setSearchText] = useState('');
  const [query, setQuery] = useState('');
  const [ingredientMode, setIngredientMode] = useState<IngredientMode>('include');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const view = useSyncExternalStore(subscribeView, readView, () => 'full' as View);
  const [openDish, setOpenDish] = useState<Dish | null>(null);
  /** A brief pause before the result appears, so the loading skeleton still shows. */
  const [ready, setReady] = useState(false);

  /** Filtering runs 200ms after typing stops, not on every keystroke. */
  useEffect(() => {
    const id = setTimeout(() => setQuery(searchText), 200);
    return () => clearTimeout(id);
  }, [searchText]);

  useEffect(() => {
    const id = setTimeout(() => setReady(true), 500);
    return () => clearTimeout(id);
  }, []);

  /**
   * Text query over everything known about a dish, then the ingredient
   * filter: Include keeps dishes that have every chosen ingredient, Exclude
   * drops dishes that have any of them (a dish with no ingredient data
   * cannot match an Include and is kept by an Exclude).
   */
  const matches = useMemo(() => {
    const q = plain(query.trim());
    return result.dishes.filter((dish) => {
      const f = facts[dish.name];
      if (q) {
        const hay = [dish.name, dish.description, dish.category, f?.description, ...(f?.ingredients ?? [])]
          .filter(Boolean)
          .map((s) => plain(s as string))
          .join(' ');
        if (!hay.includes(q)) return false;
      }
      if (ingredients.length) {
        const has = new Set((f?.ingredients ?? []).map(plain));
        return ingredientMode === 'include'
          ? ingredients.every((i) => has.has(plain(i)))
          : !ingredients.some((i) => has.has(plain(i)));
      }
      return true;
    });
  }, [query, ingredients, ingredientMode]);

  /** The verdict for a dish, if it was one of the roulette's picks. */
  const verdictFor = useCallback(
    (name: string) => result.picks.find((p) => p.dish.name === name)?.justification,
    [],
  );

  const close = useCallback(() => setOpenDish(null), []);
  const filtering = query.trim().length > 0 || ingredients.length > 0;

  return (
    <>
      <Header />

      <main className="mx-auto w-full max-w-[44rem] flex-1 px-4 pt-3 pb-14 sm:px-6 sm:pt-4">
        <div className="grid gap-8 sm:gap-10">
          <Card className="py-5 sm:py-6">
            {/* Phone: Back and the view toggle share the first row, search takes the second. */}
            <div className="flex flex-wrap items-center gap-3">
              <ButtonLink href="/">{copy.back}</ButtonLink>
              <div className="order-3 basis-full sm:order-2 sm:basis-auto sm:flex-1">
                <SearchField value={searchText} onChange={setSearchText} label={copy.searchDishes} />
              </div>
              <div className="order-2 ml-auto sm:order-3 sm:ml-0">
                <ToggleGroup
                  label={copy.menuTitle}
                  value={view}
                  onChange={writeView}
                  options={[
                    { value: 'full', label: copy.viewFull },
                    { value: 'compact', label: copy.viewCompact },
                  ]}
                />
              </div>
            </div>
            {ready && <p className="mt-3 italic text-ink-soft">{hostOf(result.url)}</p>}
            {ready && (
              <div className="mt-3">
                <IngredientFilter
                  options={ingredientOptions}
                  selected={ingredients}
                  mode={ingredientMode}
                  onSelectedChange={setIngredients}
                  onModeChange={setIngredientMode}
                />
              </div>
            )}
          </Card>

          {!ready && (
            <Card>
              <SectionTitle>{copy.readingMenu}</SectionTitle>
              <div className="mt-6 grid gap-3">
                {[80, 60, 72, 55, 66, 48].map((w, i) => (
                  <Skeleton key={i} className="h-6" style={{ width: `${w}%` }} />
                ))}
              </div>
            </Card>
          )}

          {ready && (
            <div data-results className="grid gap-8 sm:gap-10">
              {result.picks.length > 0 && !filtering && (
                <Card>
                  <SectionTitle>{copy.suggestionsTitle}</SectionTitle>
                  <p className="mt-2 text-center italic text-ink-soft">{copy.forTable(partySize)}</p>
                  <div className="mt-6">
                    <DishGrid
                      dishes={result.picks.map((p) => p.dish)}
                      facts={facts}
                      view={view}
                      onOpen={setOpenDish}
                    />
                  </div>
                </Card>
              )}

              <Card>
                <SectionTitle>{copy.menuTitle}</SectionTitle>
                <div className="mt-8">
                  <MenuList dishes={matches} facts={facts} view={view} onOpen={setOpenDish} />
                </div>
                <Provenance
                  dishCount={result.dishes.length}
                  source={result.source}
                  restaurantName={result.restaurantName}
                  sessionViewerUrl={result.sessionViewerUrl}
                />
              </Card>
            </div>
          )}
        </div>
      </main>

      <footer className="mx-auto w-full max-w-[44rem] px-4 pb-8 text-center text-base italic text-ink-soft sm:px-6">
        <p>{copy.madeBy}</p>
        <p className="mt-1 text-sm not-italic text-ink-soft/80">
          {copy.demoNotice.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </p>
      </footer>

      <Modal open={openDish !== null} onClose={close}>
        {openDish && (
          <DishDetail
            dish={openDish}
            facts={facts[openDish.name]}
            layout="stack"
            verdict={verdictFor(openDish.name)}
          />
        )}
      </Modal>
    </>
  );
}
