'use client';
/** OWNER: Workstream D (UI) — the entry point. URL + party size + the plate. */
import { useState } from 'react';
import { copy } from '../copy';

export function UrlForm({ onSubmit }: { onSubmit: (url: string, partySize: number) => void }) {
  const [url, setUrl] = useState<string>(copy.urlExampleValue);
  const [partySize, setPartySize] = useState(2);

  const clamp = (n: number) => Math.min(12, Math.max(1, n));

  return (
    <form
      className="flex flex-col items-center gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (url.trim()) onSubmit(url.trim(), partySize);
      }}
    >
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder={copy.urlPlaceholder}
        aria-label={copy.urlLabel}
        className="field w-full px-4 py-2 text-xl"
      />

      <label className="flex items-baseline gap-3 text-xl">
        {copy.partySize}
        <input
          type="number"
          min={1}
          max={12}
          value={partySize}
          onChange={(e) => setPartySize(clamp(Number(e.target.value) || 1))}
          aria-label={copy.partySize}
          className="field h-12 w-16 text-center text-3xl font-semibold"
        />
      </label>

      <button
        type="submit"
        disabled={!url.trim()}
        className="group flex flex-col items-center gap-1 disabled:opacity-40"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/plate-mark.png"
          alt=""
          className="h-40 w-40 transition-transform duration-200 group-enabled:group-hover:scale-[1.04] group-enabled:group-active:scale-[0.98] motion-reduce:transition-none sm:h-52 sm:w-52"
        />
        <span className="text-2xl font-semibold tracking-[0.25em] text-ink uppercase">{copy.search}</span>
      </button>
    </form>
  );
}
