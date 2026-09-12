'use client';
/**
 * OWNER: Workstream D (UI)
 *
 * The small controls every page shares: the outlined button (as a link or a
 * button), the two-way view toggle, and the search field. One look for all
 * of them — green hairline, cream fill when active.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';

const buttonClass =
  'inline-flex min-h-11 items-center justify-center border border-room px-4 text-base font-semibold tracking-wide rounded-none transition-colors motion-reduce:transition-none';
const idle = 'bg-transparent text-room hover:bg-room/10';
const active = 'bg-room text-cream';

export function ButtonLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={`${buttonClass} ${idle}`}>
      {children}
    </Link>
  );
}

export function ToggleGroup<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={`${buttonClass} -ml-px first:ml-0 ${o.value === value ? active : idle}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={label}
      aria-label={label}
      className="field min-h-11 w-full px-3 text-lg"
    />
  );
}
