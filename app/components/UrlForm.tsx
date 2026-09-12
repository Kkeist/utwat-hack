'use client';
/** OWNER: Workstream D (UI) — the entry point. URL + party size. */
import { useState } from 'react';

export function UrlForm({
  onSubmit,
  busy,
}: {
  onSubmit: (url: string, partySize: number) => void;
  busy: boolean;
}) {
  const [url, setUrl] = useState('');
  const [partySize, setPartySize] = useState(2);

  const clamp = (n: number) => Math.min(12, Math.max(1, n));

  return (
    <form
      className="font-sans flex flex-col items-center gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (url.trim()) onSubmit(url.trim(), partySize);
      }}
    >
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Fill in the URL"
        aria-label="Restaurant URL"
        className="w-full rounded-none border-[3px] border-ink bg-surface px-5 py-1.5 text-xl text-foreground outline-none placeholder:text-muted focus:border-accent"
      />

      <div className="flex items-center gap-3 text-xl text-foreground">
        <span id="party-size-label">Party size</span>
        <div className="flex items-stretch border-[3px] border-ink">
          <button
            type="button"
            aria-label="Decrease party size"
            disabled={partySize <= 1}
            onClick={() => setPartySize((p) => clamp(p - 1))}
            className="flex h-11 w-11 items-center justify-center text-2xl font-bold disabled:opacity-30"
          >
            −
          </button>
          <span
            role="spinbutton"
            aria-labelledby="party-size-label"
            aria-valuemin={1}
            aria-valuemax={12}
            aria-valuenow={partySize}
            className="flex h-11 w-11 items-center justify-center border-x-[3px] border-ink text-2xl font-bold"
          >
            {partySize}
          </span>
          <button
            type="button"
            aria-label="Increase party size"
            disabled={partySize >= 12}
            onClick={() => setPartySize((p) => clamp(p + 1))}
            className="flex h-11 w-11 items-center justify-center text-2xl font-bold disabled:opacity-30"
          >
            +
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="flex flex-col items-center gap-2 disabled:opacity-40"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/plate-mark.png" alt="" className="h-40 w-40 sm:h-48 sm:w-48" />
        <span className="font-sans text-2xl font-extrabold tracking-wide text-ink uppercase">
          {busy ? 'Searching…' : 'Search'}
        </span>
      </button>
    </form>
  );
}
