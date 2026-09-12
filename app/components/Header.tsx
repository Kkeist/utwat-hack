/**
 * OWNER: Workstream D (UI)
 *
 * The awning banner: striped fabric (`.awning-pleats`, globals.css), the
 * fork/knife artwork (each already a full plate-plus-utensil illustration —
 * no extra badge frame drawn around it, that would just double the plate
 * motif), the DISHLY wordmark, and a scalloped valance along the bottom edge.
 *
 * The valance is NOT a separate shape stacked under a rectangular content
 * box — that reads as two pieces glued together at a seam. Instead the
 * stripe pattern continues straight through a dedicated bottom band, which
 * is then clipped to the wave with `clip-path: url(#awning-scallop-clip)`.
 *
 * `clipPathUnits="objectBoundingBox"` is what lets one 0–1 path clip the
 * band at any width — a pixel-coordinate clip-path can't stretch full-bleed.
 *
 * Icons are plain `<img>`, not next/image: next/image's build-time cache is
 * keyed on the file path, so overwriting fork.png/knife.png in place (the
 * expected workflow while art is still being iterated on) served the old
 * cached version until the cache was cleared. A plain `<img>` always hits
 * the file as it is on disk.
 */
const SCALLOP_CLIP_PATH =
  'M0,0 L1,0 L1,0.0556 Q0.9417,0.8222 0.88,0.2 Q0.8033,0.9333 0.7333,0.0889 ' +
  'Q0.66,0.8444 0.5867,0.1778 Q0.5083,0.9556 0.4367,0.0667 Q0.37,0.8667 0.2967,0.1556 ' +
  'Q0.2083,0.9333 0.1417,0.1111 Q0.0667,0.889 0,0.0444 Z';

export function Header() {
  return (
    <header className="relative w-full">
      {/* Reusable clip shape, defined once, referenced by the band below. */}
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <clipPath id="awning-scallop-clip" clipPathUnits="objectBoundingBox">
          <path d={SCALLOP_CLIP_PATH} />
        </clipPath>
      </svg>

      {/*
        Two independent full-width bands, NOT one nested inside the other.
        If the scallop band lived inside the content band's own colored box,
        clipping it would only clip itself — the content band's rectangular
        fill behind it would still cover the notches and nothing would show
        through to the body color underneath.
      */}
      <div className="awning-pleats w-full">
        <div className="mx-auto flex max-w-3xl items-center justify-center gap-4 px-6 pt-8 pb-4 sm:gap-8 sm:pt-10 sm:pb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/fork.png" alt="" className="h-14 w-14 shrink-0 sm:h-20 sm:w-20" />
          <h1 className="font-logo text-4xl text-accent sm:text-6xl">DISHLY</h1>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/knife.png" alt="" className="h-14 w-14 shrink-0 sm:h-20 sm:w-20" />
        </div>
      </div>

      {/* The scalloped hem. Same stripe pattern, continuing seamlessly, clipped to the wave. */}
      <div
        className="awning-pleats h-10 w-full sm:h-16"
        style={{ clipPath: 'url(#awning-scallop-clip)' }}
      />
    </header>
  );
}
