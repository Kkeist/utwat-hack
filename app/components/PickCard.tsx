'use client';
/**
 * OWNER: Workstream D (UI)
 *
 * The result. Name, price and justification render IMMEDIATELY from data already
 * in hand; the photo and the Wikipedia line fade in when they land, behind
 * shimmer skeletons. Nothing here waits on a lookup — a spinner over the whole
 * card makes a 1.5s wait feel broken. (Design doc §9.)
 */
import type { DishFacts, Pick } from '@/lib/types';
import { Skeleton } from './Skeleton';

export function PickCard({ pick, facts }: { pick: Pick; facts?: DishFacts }) {
  return (
    <article className="rounded border border-border bg-surface p-5">
      <p className="text-xs uppercase tracking-widest text-muted">
        {pick.shared ? `Shared ${pick.course}` : `Seat ${pick.seat} · ${pick.course}`}
      </p>

      <h3 className="mt-1 text-2xl">{pick.dish.name}</h3>
      {pick.dish.price && <p className="text-accent">{pick.dish.price}</p>}

      <p className="mt-3 leading-relaxed">{pick.justification}</p>

      <div className="mt-4">
        {facts ? (
          <>
            {facts.photoUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={facts.photoUrl} alt="" className="mb-2 rounded" />
            )}
            {facts.description && <p className="text-sm text-muted">{facts.description}</p>}
            <a href={facts.searchUrl} target="_blank" rel="noreferrer" className="text-sm text-accent">
              Look it up
            </a>
          </>
        ) : (
          <Skeleton className="h-16 w-full" />
        )}
      </div>
    </article>
  );
}
