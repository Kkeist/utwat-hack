/**
 * OWNER: Workstream D (UI)
 *
 * The colophon at the foot of the menu card: dish count and which Steel path
 * produced it. When the browser path ran, link the live session viewer.
 */
import type { ScrapeSource } from '@/lib/types';
import { copy } from '../copy';

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
    <p className="mt-10 border-t border-gold-soft pt-3 text-center text-base italic text-ink-soft">
      {copy.dishesRead(dishCount, source === 'scrape' ? copy.scrapePath : copy.browserPath)}
      {sessionViewerUrl && (
        <>
          {' '}
          <a
            href={sessionViewerUrl}
            target="_blank"
            rel="noreferrer"
            className="text-tomato underline decoration-tomato/40 underline-offset-4 hover:decoration-tomato"
          >
            {copy.watchSession}
          </a>
        </>
      )}
    </p>
  );
}
