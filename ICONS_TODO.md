# Icons to draw — Dishly landing page

Three icon files. Each currently has a placeholder (simple line art, just
enough to make the layout look right) at the exact path listed below. Drop
your finished artwork in at the **same path, same filename** and it swaps in
automatically — no code change needed.

- [ ] **`public/icons/fork.svg`** — small utensil icon, left of the "DISHLY"
      wordmark in the header. Displayed at roughly 36×36px. Square canvas,
      transparent background, single line-art icon (matches the sketch's fork
      next to the logo).
- [ ] **`public/icons/knife.svg`** — same spec as the fork, mirrored side,
      right of the wordmark.
- [ ] **`public/icons/plate-mark.svg`** — the round emblem inside the big
      "Search" button (the plate with a swirl/mark in the middle from the
      sketch). Displayed at roughly 130×130px. Square canvas, this one is the
      most visible element on the page — it's the button itself.

## Format

SVG is preferred (stays sharp at any size). A PNG with a transparent
background works too — just keep the `.svg` extension in the filename or
tell me and I'll update the three references in `app/components/Header.tsx`
and `app/components/UrlForm.tsx` to match a different extension.

## Not built yet, don't worry about it now

`plate-mark.svg` will likely double as the source image for the site's
favicon and home-screen icons later (that's a separate, bigger task —
covers the browser tab icon, iOS/Android home-screen icons, etc.). Nothing
to do for that yet; just draw the plate mark for the button.
