/**
 * OWNER: Workstream D (UI)
 *
 * The menu card: cream stock with a printed double rule. Every block on the
 * page — the entry form, the suggestions, the menu itself — is one of these,
 * so they all share one frame, one padding, one lift off the table.
 *
 * `SectionTitle` is the script heading between two gold rules that opens a
 * card or a course inside the menu.
 */
import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`menu-card stock-grain paper-grain relative px-5 py-7 sm:px-10 sm:py-8 ${className}`}>
      {children}
    </section>
  );
}

export function SectionTitle({ children, as: Tag = 'h2' }: { children: ReactNode; as?: 'h2' | 'h3' }) {
  return (
    <Tag className="flex items-center gap-4">
      <span aria-hidden className="h-px flex-1 bg-gold" />
      <span className="font-script text-center text-3xl leading-tight text-room sm:text-4xl">{children}</span>
      <span aria-hidden className="h-px flex-1 bg-gold" />
    </Tag>
  );
}
