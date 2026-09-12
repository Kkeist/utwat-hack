'use client';
/**
 * OWNER: Workstream D (UI)
 *
 * Centred dialog on a darkened table. Closes on the backdrop, the close
 * button, or Escape. While open the page behind cannot scroll; the scroll
 * position is untouched, so closing lands exactly where the user was.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { copy } from '../copy';
import { Card } from './Card';

export function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="max-h-[85vh] overflow-y-auto overscroll-contain">
          {children}
          <div className="mt-6 text-center">
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 items-center justify-center rounded-none border border-room px-5 text-base font-semibold tracking-wide text-room hover:bg-room/10"
            >
              {copy.close}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
