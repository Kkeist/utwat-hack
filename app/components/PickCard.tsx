'use client';
/**
 * OWNER: Workstream D (UI)
 *
 * One suggested dish. Name, price and the line about it render immediately
 * from data already in hand; the photo and the looked-up sentence fade in
 * when they land, behind a shimmer. Nothing here waits on a lookup.
 */
import type { DishFacts, Pick } from '@/lib/types';
import { copy } from '../copy';
import { Skeleton } from './Skeleton';

export function PickCard({ pick, facts }: { pick: Pick; facts?: DishFacts }) {
  const who = pick.shared ? copy.shared : pick.seat ? copy.seat(pick.seat) : '';

  return (
    <article className="flex flex-col border border-gold-soft bg-cream-deep/60 p-5">
      {facts?.photoUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={facts.photoUrl}
          alt=""
          className="mb-4 aspect-[4/3] w-full border border-gold-soft object-cover"
        />
      ) : !facts ? (
        <Skeleton className="mb-4 aspect-[4/3] w-full" />
      ) : null}

      <p className="text-sm italic text-ink-soft">
        {who}
        {who && ', '}
        {pick.course}
      </p>
      <h3 className="mt-0.5 text-2xl font-semibold leading-tight">{pick.dish.name}</h3>
      {pick.dish.price && <p className="font-semibold text-tomato">{pick.dish.price}</p>}

      <p className="mt-3 leading-relaxed">{pick.justification}</p>

      <div className="mt-auto pt-3">
        {facts ? (
          <>
            {facts.description && <p className="italic text-ink-soft">{facts.description}</p>}
            <a
              href={facts.searchUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-base text-tomato underline decoration-tomato/40 underline-offset-4 hover:decoration-tomato"
            >
              {copy.lookItUp}
            </a>
          </>
        ) : (
          <Skeleton className="h-12 w-full" />
        )}
      </div>
    </article>
  );
}
