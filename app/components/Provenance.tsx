/**
 * OWNER: Workstream D (UI)
 *
 * Footer. Dish count and which Steel path produced the menu — useful to us while
 * debugging, and it quietly demonstrates the two-tier strategy to judges. When the
 * playwright path ran, link the live session viewer: that is the sponsor moment.
 * (Design doc §9, §10.)
 */
import type { ScrapeSource } from '@/lib/types';

export function Provenance({
  dishCount,
  source,
  sessionViewerUrl,
}: {
  dishCount: number;
  source: ScrapeSource;
  sessionViewerUrl?: string;
}) {
  return (
    <footer className="mt-10 border-t border-border pt-4 text-xs text-muted">
      {dishCount} dishes · via Steel {source === 'scrape' ? '/scrape' : 'session + Playwright'}
      {sessionViewerUrl && (
        <>
          {' · '}
          <a href={sessionViewerUrl} target="_blank" rel="noreferrer" className="text-accent">
            watch the session
          </a>
        </>
      )}
    </footer>
  );
}
