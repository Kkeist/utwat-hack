'use client';
/**
 * PLACEHOLDER — owned by workstream D, written by C so the flow is testable.
 * Structure and behaviour only, no design. Replace it wholesale.
 *
 * The recommendation is behind a button rather than rendered inline: the spin
 * is the moment, and revealing it should be an act. Native <dialog> so focus
 * trapping, Escape, and the backdrop come from the platform rather than from
 * 200 lines nobody has time to write.
 */
import { useEffect, useRef } from 'react';
import type { DishFacts, Pick } from '@/lib/types';
import { PickCard } from './PickCard';

export function PicksDialog({
  picks,
  facts,
  open,
  onClose,
  upgrading,
}: {
  picks: Pick[];
  facts: Record<string, DishFacts>;
  open: boolean;
  onClose: () => void;
  upgrading: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="w-[min(44rem,92vw)] rounded border border-border bg-surface p-0 text-foreground backdrop:bg-black/70"
    >
      <div className="flex items-baseline justify-between border-b border-border px-5 py-3">
        <h2 className="text-xl">The determination</h2>
        <button onClick={onClose} className="text-sm text-muted hover:text-accent">
          Close
        </button>
      </div>

      <div className="grid max-h-[70vh] gap-3 overflow-y-auto p-5">
        {picks.map((pick, i) => (
          <PickCard key={i} pick={pick} facts={facts[pick.dish.name]} />
        ))}
      </div>

      {/* The upgraded text arrives after the dialog is already readable. */}
      {upgrading && (
        <p className="border-t border-border px-5 py-2 text-xs text-muted">
          Entering the full reasoning into the record…
        </p>
      )}
    </dialog>
  );
}
