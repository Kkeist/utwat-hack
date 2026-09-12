/**
 * OWNER: Workstream D (UI)
 *
 * The awning banner. Full-bleed on every breakpoint; the scalloped edge
 * (`.scallop-edge`, globals.css) is what separates it from the page body
 * beneath, same as a restaurant's storefront canopy.
 */
import Image from 'next/image';

export function Header() {
  return (
    <header className="relative w-full">
      <div className="w-full bg-awning">
        <div className="mx-auto flex max-w-3xl items-center justify-center gap-4 px-6 pt-8 pb-10 sm:gap-6 sm:pt-10">
          <Image src="/icons/fork.svg" alt="" width={32} height={32} className="h-7 w-7 shrink-0 sm:h-9 sm:w-9" />
          <h1 className="font-logo text-4xl font-semibold tracking-wide text-accent sm:text-6xl">
            DISHLY
          </h1>
          <Image src="/icons/knife.svg" alt="" width={32} height={32} className="h-7 w-7 shrink-0 sm:h-9 sm:w-9" />
        </div>
      </div>
      {/* Sits directly on the page background (no bg-awning of its own container) so the mask's cutouts show tan through it. */}
      <div className="scallop-edge" />
    </header>
  );
}
