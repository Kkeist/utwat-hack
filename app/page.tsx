'use client';
/**
 * OWNER: Workstream D (UI)
 *
 * Page shell and all client state. Two things here are load-bearing:
 *
 *   1. Nothing blocks on enrichment. Picks render the instant /api/menu returns.
 *   2. Background prefetch. The moment a menu renders, the first ~8 unpicked
 *      dishes are looked up in parallel, non-blocking, so they are warm by the
 *      time the user starts clicking. (Design doc §4.)
 */
import { useState } from 'react';
import type { Dish, DishFacts, MenuResponse } from '@/lib/types';
import { copy } from './copy';
import { Card, SectionTitle } from './components/Card';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { PickCard } from './components/PickCard';
import { MenuList } from './components/MenuList';
import { Provenance } from './components/Provenance';
import { Skeleton } from './components/Skeleton';

const PREFETCH_COUNT = 8;

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function Home() {
  const [result, setResult] = useState<MenuResponse | null>(null);
  const [facts, setFacts] = useState<Record<string, DishFacts>>({});
  const [partySize, setPartySize] = useState(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function spin(url: string, size: number) {
    setBusy(true);
    setError(null);
    setResult(null);
    setPartySize(size);
    try {
      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url, partySize: size }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? copy.genericError);
      const menu = json as MenuResponse;
      setResult(menu);
      setFacts(menu.facts);
      void prefetch(menu);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.genericError);
    } finally {
      setBusy(false);
    }
  }

  async function enrich(dishes: Dish[]) {
    if (!dishes.length) return;
    const res = await fetch('/api/dish', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ dishes }),
    });
    if (!res.ok) return;
    const json = await res.json();
    setFacts((prev) => ({ ...json.facts, ...prev }));
  }

  /**
   * Quiet background prefetch, fired the moment a menu lands and deliberately
   * never awaited. By the time the user finishes reading the result and starts
   * clicking, the first few dishes are already warm.
   */
  function prefetch(menu: MenuResponse) {
    const picked = new Set(menu.picks.map((p) => p.dish.name));
    const cold = menu.dishes.filter((d) => !picked.has(d.name)).slice(0, PREFETCH_COUNT);
    return enrich(cold);
  }

  return (
    <>
      <Header />

      <main className="mx-auto w-full max-w-[44rem] flex-1 px-4 pt-3 pb-14 sm:px-6 sm:pt-4">
        <div className="grid gap-8 sm:gap-10">
          <Hero onSubmit={spin} busy={busy} />

          {error && <p className="text-center text-tomato">{error}</p>}

          {busy && (
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
              <Card>
                <SectionTitle>{copy.suggestionsTitle}</SectionTitle>
                <p className="mt-2 text-center italic text-ink-soft">
                  {copy.forTable(partySize)}, {hostOf(result.url)}
                </p>
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  {result.picks.map((pick, i) => (
                    <PickCard key={i} pick={pick} facts={facts[pick.dish.name]} />
                  ))}
                </div>
              </Card>

              <Card>
                <SectionTitle>{copy.menuTitle}</SectionTitle>
                <div className="mt-8">
                  <MenuList
                    dishes={result.dishes}
                    facts={facts}
                    onSelect={(dish) => void enrich([dish])}
                  />
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
    </>
  );
}
