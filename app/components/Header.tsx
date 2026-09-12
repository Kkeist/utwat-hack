/**
 * OWNER: Workstream D (UI)
 *
 * The awning: green and cream canvas, the fork and knife plates, the painted
 * Dishly wordmark, and a scalloped valance along the hem.
 *
 * The valance is the same stripe pattern continuing into a band that is then
 * clipped to the scallop wave, so the stripes run straight through the hem
 * instead of two shapes meeting at a seam. A cream copy of the same band sits
 * 4px lower behind it as piping, so the green scallops keep their edge where
 * they fall against the green walls.
 *
 * `clipPathUnits="objectBoundingBox"` lets one 0–1 path clip the band at any
 * width. Icons are plain `<img>`: next/image caches by file path, and the
 * art is still being overwritten in place.
 */
import { copy } from '../copy';

const SCALLOP_CLIP_PATH =
  'M0,0 L1,0 L1,0.0556 Q0.9417,0.8222 0.88,0.2 Q0.8033,0.9333 0.7333,0.0889 ' +
  'Q0.66,0.8444 0.5867,0.1778 Q0.5083,0.9556 0.4367,0.0667 Q0.37,0.8667 0.2967,0.1556 ' +
  'Q0.2083,0.9333 0.1417,0.1111 Q0.0667,0.889 0,0.0444 Z';

export function Header() {
  return (
    <header className="relative w-full">
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <clipPath id="awning-scallop-clip" clipPathUnits="objectBoundingBox">
          <path d={SCALLOP_CLIP_PATH} />
        </clipPath>
      </svg>

      <div className="awning-stripes w-full">
        <div className="mx-auto flex max-w-3xl items-center justify-center gap-4 px-4 pt-7 pb-2 sm:gap-9 sm:pt-9 sm:pb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/fork.png" alt="" className="h-16 w-16 shrink-0 sm:h-24 sm:w-24" />
          <h1
            className="wordmark -translate-x-[0.04em] text-[3.6rem] sm:text-[5.6rem]"
            data-text={copy.brand}
          >
            {copy.brand}
          </h1>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/knife.png" alt="" className="h-16 w-16 shrink-0 sm:h-24 sm:w-24" />
        </div>
      </div>

      <div className="relative h-10 w-full sm:h-14">
        <div
          aria-hidden
          className="absolute inset-0 translate-y-1 bg-cream"
          style={{ clipPath: 'url(#awning-scallop-clip)' }}
        />
        <div
          className="awning-stripes absolute inset-0"
          style={{ clipPath: 'url(#awning-scallop-clip)' }}
        />
      </div>
    </header>
  );
}
