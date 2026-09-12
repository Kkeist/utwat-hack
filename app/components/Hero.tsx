/**
 * OWNER: Workstream D (UI)
 *
 * The "RESTAURANT" label plus the entry form. Kept separate from Header so the
 * awning banner stays reusable chrome and this stays page content.
 */
import { UrlForm } from './UrlForm';

export function Hero({
  onSubmit,
  busy,
}: {
  onSubmit: (url: string, partySize: number) => void;
  busy: boolean;
}) {
  return (
    <section className="mx-auto w-full max-w-xl px-6 pt-4 text-center">
      <span className="font-logo inline-block rounded-full bg-ink px-8 py-2 text-2xl tracking-widest text-accent uppercase">
        Restaurant
      </span>

      <div className="mt-8">
        <UrlForm onSubmit={onSubmit} busy={busy} />
      </div>
    </section>
  );
}
