'use client';
/** OWNER: Workstream D (UI) — the entry point. URL + party size. */
import { useState } from 'react';
import Image from 'next/image';

export function UrlForm({
  onSubmit,
  busy,
}: {
  onSubmit: (url: string, partySize: number) => void;
  busy: boolean;
}) {
  const [url, setUrl] = useState('');
  const [partySize, setPartySize] = useState(2);

  return (
    <form
      className="font-hand flex flex-col items-center gap-6"
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
        className="w-full rounded-none border-[3px] border-ink bg-surface px-4 py-3 text-lg text-foreground outline-none placeholder:text-muted focus:border-accent"
      />

      <label className="flex items-center gap-3 text-lg text-foreground">
        Party size
        <input
          type="number"
          min={1}
          max={12}
          value={partySize}
          onChange={(e) => setPartySize(Number(e.target.value))}
          className="no-spinner h-11 w-11 rounded-none border-[3px] border-ink bg-surface text-center text-2xl font-bold text-foreground outline-none focus:border-accent"
        />
      </label>

      <button
        type="submit"
        disabled={busy}
        className="flex flex-col items-center gap-2 disabled:opacity-40"
      >
        <span className="flex h-32 w-32 items-center justify-center rounded-full border-[3px] border-ink bg-surface p-3 sm:h-36 sm:w-36">
          <Image src="/icons/plate-mark.svg" alt="" width={128} height={128} className="h-full w-full" />
        </span>
        <span className="font-logo text-xl text-ink uppercase">{busy ? 'Searching…' : 'Search'}</span>
      </button>
    </form>
  );
}
