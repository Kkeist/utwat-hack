/**
 * OWNER: Workstream D (UI)
 *
 * The awning banner: pleated fabric (`.awning-pleats`, globals.css), the
 * fork/knife artwork (each already a full plate-plus-utensil illustration —
 * no extra badge frame drawn around it, that would just double the plate
 * motif), the DISHLY wordmark, and a scalloped valance along the bottom edge.
 *
 * The valance is NOT a separate shape stacked under a rectangular content
 * box — that reads as two pieces glued together at a seam. Instead the
 * pleat pattern continues straight through a dedicated bottom band, which
 * is then clipped to the wave with `clip-path: url(#awning-scallop-clip)`.
 * The drawn outline is a second SVG laid exactly over that same band using
 * the same curve, so the ink line traces the true clipped edge.
 *
 * `clipPathUnits="objectBoundingBox"` is what lets one 0–1 path clip the
 * band at any width — a pixel-coordinate clip-path can't stretch full-bleed.
 */
import Image from 'next/image';


const SCALLOP_STROKE_PATH =
  'M0,4 Q40,80 85,10 Q125,84 178,14 Q222,78 262,6 Q305,86 352,16 Q396,76 440,8 Q482,84 528,18 Q565,74 600,5';

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
      <div className="awning-pleats w-full bg-awning">
        <div className="mx-auto flex max-w-3xl items-center justify-center gap-4 px-6 pt-8 pb-4 sm:gap-8 sm:pt-10 sm:pb-6">
          <Image src="/icons/fork.png" alt="" width={80} height={80} className="h-14 w-14 shrink-0 sm:h-20 sm:w-20" />
          <h1 className="font-logo text-4xl text-accent sm:text-6xl">DISHLY</h1>
          <Image src="/icons/knife.png" alt="" width={80} height={80} className="h-14 w-14 shrink-0 sm:h-20 sm:w-20" />
        </div>
      </div>

      {/* The scalloped hem. Same pleat pattern, continuing seamlessly, clipped to the wave. */}
      <div className="relative h-12 w-full sm:h-20">
        <div
          className="awning-pleats h-full w-full bg-awning"
          style={{ clipPath: 'url(#awning-scallop-clip)' }}
        />
        <svg
          viewBox="0 0 600 90"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <path
            d={SCALLOP_STROKE_PATH}
            fill="none"
            className="stroke-ink"
            strokeWidth={5}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </header>
  );
}
