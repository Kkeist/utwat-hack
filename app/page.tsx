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
import { UrlForm } from './components/UrlForm';
import { MenuList } from './components/MenuList';
import { Provenance } from './components/Provenance';
import { PicksDialog } from './components/PicksDialog';

const PREFETCH_COUNT = 8;

export default function Home() {
  const [result, setResult] = useState<MenuResponse | null>(null);
  const [facts, setFacts] = useState<Record<string, DishFacts>>({});
  const [busy, setBusy] = useState(false);
  const [showPicks, setShowPicks] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
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
      // Deliberately NOT opened here. The button is the reveal — the spin is the
      // moment of the app, and it should take a deliberate click to see it.
      setShowPicks(false);
      void upgradeText(menu);
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
   * Optional: ask Claude for better-written justifications. The picks are already
   * on screen with the templated text, so this only ever improves what is there.
   * An empty response means Claude was unreachable or unconfigured — the user
   * sees no difference and no error.
   */
  async function upgradeText(menu: MenuResponse) {
    setUpgrading(true);
    try {
      const res = await fetch('/api/justify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ picks: menu.picks, partySize: menu.partySize, signals: menu.signals }),
      });
      if (!res.ok) return;
      const { justifications } = await res.json();
      if (!justifications || !Object.keys(justifications).length) return;
      setResult((prev) =>
        prev && {
          ...prev,
          picks: prev.picks.map((p) => ({ ...p, justification: justifications[p.dish.name] ?? p.justification })),
        },
      );
    } catch {
      // Keep the templated text. Not a user-visible failure.
    } finally {
      setUpgrading(false);
    }
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
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="text-5xl">Dishly</h1>
      <p className="mt-2 text-muted">
        Point it at a restaurant. The decision has already been made.
      </p>

      <div className="mt-8">
        <UrlForm onSubmit={spin} busy={busy} />
      </div>

      {error && <p className="mt-6 text-sm text-accent">{error}</p>}

      {result && (
        <>
          <section className="mt-10">
            <button
              onClick={() => setShowPicks(true)}
              className="rounded border border-accent px-5 py-3 text-lg text-accent"
            >
              See what you are having ({result.picks.length} dishes)
            </button>
          </section>

          <PicksDialog
            picks={result.picks}
            facts={facts}
            open={showPicks}
            onClose={() => setShowPicks(false)}
            upgrading={upgrading}
          />

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
            restaurantName={result.restaurantName}
            sessionViewerUrl={result.sessionViewerUrl}
          />
        </>
      )}
    </main>
  );
}
