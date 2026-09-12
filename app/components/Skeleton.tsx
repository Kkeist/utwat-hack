/** OWNER: Workstream D (UI) — shimmer placeholder for enrichment that has not landed. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`shimmer rounded bg-border/60 ${className}`} />;
}
