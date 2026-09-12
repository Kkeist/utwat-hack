/** OWNER: Workstream D (UI) — shimmer placeholder for facts that have not landed. */
import type { CSSProperties } from 'react';

export function Skeleton({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return <div className={`shimmer bg-gold-soft/40 ${className}`} style={style} />;
}
