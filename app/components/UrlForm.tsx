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

  return (
    <form
      className="flex flex-col gap-4 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        if (url.trim()) onSubmit(url.trim(), partySize);
      }}
    >
      <label className="flex-1 text-sm text-muted">
        Restaurant
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-base text-foreground outline-none focus:border-accent"
        />
      </label>

      <label className="text-sm text-muted">
        Party of
        <input
          type="number"
          min={1}
          max={12}
          value={partySize}
          onChange={(e) => setPartySize(Number(e.target.value))}
          className="mt-1 w-20 rounded border border-border bg-surface px-3 py-2 text-base text-foreground outline-none focus:border-accent"
        />
      </label>

      <button
        type="submit"
        disabled={busy}
        className="rounded border border-accent px-5 py-2 text-base text-accent disabled:opacity-40"
      >
        {busy ? 'Deliberating…' : 'Spin'}
      </button>
    </form>
  );
}
