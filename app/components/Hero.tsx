/**
 * OWNER: Workstream D (UI)
 *
 * The first card: the "Restaurant" tag, the one-line instruction, the entry
 * form, and a short note on what Dishly does underneath.
 */
import { copy } from '../copy';
import { Card } from './Card';
import { UrlForm } from './UrlForm';

export function Hero({
  onSubmit,
  busy,
}: {
  onSubmit: (url: string, partySize: number) => void;
  busy: boolean;
}) {
  return (
    <Card className="text-center">
      <span className="inline-block rounded-full bg-room px-7 py-1.5 text-base font-semibold tracking-[0.22em] text-cream uppercase">
        {copy.restaurantTag}
      </span>

      <p className="mx-auto mt-4 max-w-[38ch] text-xl leading-snug">{copy.intro}</p>

      <div className="mt-6">
        <UrlForm onSubmit={onSubmit} busy={busy} />
      </div>

      <p className="mx-auto mt-8 max-w-[52ch] border-t border-gold-soft pt-5 text-base italic leading-relaxed text-ink-soft">
        {copy.about}
      </p>
    </Card>
  );
}
