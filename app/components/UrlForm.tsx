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

      <label className="flex items-baseline gap-3 text-xl text-foreground">
        Party size
        <input
          type="number"
          min={1}
          max={12}
          value={partySize}
          onChange={(e) => setPartySize(clamp(Number(e.target.value) || 1))}
          aria-label="Party size"
          className="h-12 w-16 border-2 border-ink bg-surface text-center text-3xl font-bold text-foreground outline-none focus:border-accent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      </label>

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
