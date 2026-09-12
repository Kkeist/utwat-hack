# Icons — Dishly landing page

- [x] **`public/icons/fork.png`** — fork-and-plate illustration, left of the
      "DISHLY" wordmark in the header. Delivered 2026-09-12, wired in as-is
      (no extra badge frame around it — the art already has its own plate,
      adding a circle border on top doubled the motif).
- [x] **`public/icons/knife.png`** — same treatment, right of the wordmark.
- [x] **`public/icons/plate-mark.png`** — the plate illustration inside the
      big "Search" button.

## Done

Full icon set built from `public/icons/app-icon.png` (a fresh plate
drawing, not `plate-mark.png`) via `tools/build-icons.py`:
favicon (16/32/48), Apple touch icon, Android/PWA icons (plain +
maskable, 192/512), Windows tile, and the social-share image. Wired into
`app/layout.tsx` metadata plus `public/site.webmanifest` and
`public/browserconfig.xml`.

Re-run `python tools/build-icons.py` after replacing the source image.
