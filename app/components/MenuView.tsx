'use client';
/**
 * OWNER: Workstream D (UI)
 *
 * The result page. Reads the restaurant URL and party size from the query
 * string, asks /api/menu, then looks every dish up in the background in
 * batches of 12 (the /api/dish ceiling) so photos and tags fill in while
 * the user reads. Search is a client-side filter over what is already
 * loaded — name, the menu's line, course, ingredients, description — with
 * accents ignored. The view choice is remembered in the browser.
 */
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Dish, DishFacts, MenuResponse } from '@/lib/types';
import { copy } from '../copy';
import { Card, SectionTitle } from './Card';
import { ButtonLink, SearchField, ToggleGroup } from './controls';
import { DishDetail } from './DishDetail';
import { Header } from './Header';
import { DishGrid, MenuList, type MenuView as View } from './MenuList';
import { Modal } from './Modal';
import { Provenance } from './Provenance';
import { Skeleton } from './Skeleton';

const BATCH = 12;

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

export function MenuView() {
  const params = useSearchParams();
  const url = params.get('url') ?? '';
  const partySize = Math.min(12, Math.max(1, Number(params.get('party')) || 2));

  const [result, setResult] = useState<MenuResponse | null>(null);
  const [facts, setFacts] = useState<Record<string, DishFacts>>({});
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const view = useSyncExternalStore(subscribeView, readView, () => 'full' as View);
  const [openDish, setOpenDish] = useState<Dish | null>(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;

    async function enrich(dishes: Dish[]) {
      const res = await fetch('/api/dish', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ dishes }),
      });
      if (!res.ok || cancelled) return;
      const json = await res.json();
      setFacts((prev) => ({ ...json.facts, ...prev }));
    }

    async function load() {
      setError(null);
      setResult(null);
      setFacts({});
      try {
        const res = await fetch('/api/menu', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ url, partySize }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message ?? copy.genericError);
        if (cancelled) return;
        const menu = json as MenuResponse;
        setResult(menu);
        setFacts(menu.facts);
        const cold = menu.dishes.filter((d) => !menu.facts[d.name]);
        for (let i = 0; i < cold.length; i += BATCH) {
          await enrich(cold.slice(i, i + BATCH));
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : copy.genericError);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [url, partySize]);

  const matches = useMemo(() => {
    if (!result) return [];
    const q = plain(query.trim());
    if (!q) return result.dishes;
    return result.dishes.filter((dish) => {
      const f = facts[dish.name];
      const hay = [dish.name, dish.description, dish.category, f?.description, ...(f?.ingredients ?? [])]
        .filter(Boolean)
        .map((s) => plain(s as string))
        .join(' ');
      return hay.includes(q);
    });
  }, [result, facts, query]);

  const close = useCallback(() => setOpenDish(null), []);
  const searching = query.trim().length > 0;

  return (
    <>
      <Header />

      <main className="mx-auto w-full max-w-[44rem] flex-1 px-4 pt-3 pb-14 sm:px-6 sm:pt-4">
        <div className="grid gap-8 sm:gap-10">
          <Card className="py-5 sm:py-6">
            <div className="flex flex-wrap items-center gap-3">
              <ButtonLink href="/">{copy.back}</ButtonLink>
              <div className="min-w-[12rem] flex-1">
                <SearchField value={query} onChange={setQuery} label={copy.searchDishes} />
              </div>
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
            {result && (
              <p className="mt-3 italic text-ink-soft">
                {hostOf(result.url)}, {copy.forTable(partySize)}
              </p>
            )}
          </Card>

          {error && <p className="text-center text-tomato">{error}</p>}

          {!result && !error && (
            <Card>
              <SectionTitle>{copy.readingMenu}</SectionTitle>
              <div className="mt-6 grid gap-3">
                {[80, 60, 72, 55, 66, 48].map((w, i) => (
                  <Skeleton key={i} className="h-6" style={{ width: `${w}%` }} />
                ))}
              </div>
            </Card>
          )}

          {result && (
            <div data-results className="grid gap-8 sm:gap-10">
              {result.picks.length > 0 && !searching && (
                <Card>
                  <SectionTitle>{copy.suggestionsTitle}</SectionTitle>
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
                  sessionViewerUrl={result.sessionViewerUrl}
                />
              </Card>
            </div>
          )}
        </div>
      </main>

      <footer className="pb-8 text-center text-base italic text-ink-soft">{copy.madeBy}</footer>

      <Modal open={openDish !== null} onClose={close}>
        {openDish && <DishDetail dish={openDish} facts={facts[openDish.name]} layout="stack" />}
      </Modal>
    </>
  );
}
