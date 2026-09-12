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
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { PickCard } from './components/PickCard';
import { MenuList } from './components/MenuList';
import { Provenance } from './components/Provenance';

const PREFETCH_COUNT = 8;

export default function Home() {
  const [result, setResult] = useState<MenuResponse | null>(null);
  const [facts, setFacts] = useState<Record<string, DishFacts>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function spin(url: string, partySize: number) {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url, partySize }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? 'Something went wrong.');
      const menu = json as MenuResponse;
      setResult(menu);
      setFacts(menu.facts);
      void prefetch(menu);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
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

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-12">
        <Hero onSubmit={spin} busy={busy} />

        {error && <p className="mt-6 text-center text-sm text-accent-2">{error}</p>}

        {result && (
          <>
            <section className="mt-10 grid gap-4">
              {result.picks.map((pick, i) => (
                <PickCard key={i} pick={pick} facts={facts[pick.dish.name]} />
              ))}
            </section>

            <section className="mt-12">
              <h2 className="mb-3 text-xl">The full menu</h2>
              <MenuList
                dishes={result.dishes}
                facts={facts}
                onSelect={(dish) => void enrich([dish])}
              />
            </section>

            <Provenance
              dishCount={result.dishes.length}
              source={result.source}
              sessionViewerUrl={result.sessionViewerUrl}
            />
          </>
        )}
      </main>

      <footer className="font-sans pb-6 text-center text-sm tracking-wide text-muted">
        made by 404 Brain Not Found
      </footer>
    </>
  );
}
