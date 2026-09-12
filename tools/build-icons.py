"""
Build every icon the site needs from one source image.

    python tools/build-icons.py

Source: public/icons/app-icon.png (square, transparent background).
Re-run after replacing the source; everything below is regenerated.

Outputs (public/ unless noted):
  favicon-16.png, favicon-32.png, app/favicon.ico (16/32/48)
  apple-touch-icon.png       180x180, opaque cream
  icon-192.png, icon-512.png  transparent
  icon-192-maskable.png, icon-512-maskable.png  cream ground, art in the 80% safe zone
  mstile-150x150.png          transparent
  og-image.png                1200x630, cream ground, plate centred
"""
from pathlib import Path

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "public" / "icons" / "app-icon.png"
PUBLIC = ROOT / "public"
CREAM = (247, 237, 219, 255)  # --cream in app/globals.css
SAFE_ZONE = 0.80


WHITE_MATTE_THRESHOLD = 250  # source has no alpha channel; its background is flat white


def drop_white_matte(im: Image.Image) -> Image.Image:
    """
    The source has no real transparency (alpha is 255 everywhere) — it was
    exported on a flat white matte instead. Pure white (checked well above
    the plate's own off-white fill, ~238) becomes transparent; nothing else
    in the art is that white, so this cannot eat part of the drawing.
    """
    is_white = lambda c: c.point(lambda v: 255 if v >= WHITE_MATTE_THRESHOLD else 0)
    r, g, b, _ = im.split()
    all_white = ImageChops.darker(ImageChops.darker(is_white(r), is_white(g)), is_white(b))
    out = im.copy()
    out.putalpha(ImageChops.invert(all_white))
    return out


def trimmed_square(im: Image.Image) -> Image.Image:
    """Crop transparent margins, then pad to a square so nothing is stretched."""
    alpha = im.getchannel("A").point(lambda a: 255 if a > 16 else 0)
    box = alpha.getbbox()
    im = im.crop(box)
    side = max(im.size)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(im, ((side - im.width) // 2, (side - im.height) // 2))
    return square


def fit(art: Image.Image, size: int, scale: float = 1.0, ground=None) -> Image.Image:
    """Art scaled to `scale` of the canvas, centred, on a transparent or solid ground."""
    canvas = Image.new("RGBA", (size, size), ground or (0, 0, 0, 0))
    inner = round(size * scale)
    layer = art.resize((inner, inner), Image.LANCZOS)
    offset = (size - inner) // 2
    canvas.alpha_composite(layer, (offset, offset))
    return canvas


def main() -> None:
    art = trimmed_square(drop_white_matte(Image.open(SOURCE).convert("RGBA")))

    fit(art, 16).save(PUBLIC / "favicon-16.png")
    fit(art, 32).save(PUBLIC / "favicon-32.png")
    fit(art, 48).save(
        ROOT / "app" / "favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
    )

    fit(art, 180, 0.86, CREAM).convert("RGB").save(PUBLIC / "apple-touch-icon.png")

    for size in (192, 512):
        fit(art, size).save(PUBLIC / f"icon-{size}.png")
        fit(art, size, SAFE_ZONE, CREAM).save(PUBLIC / f"icon-{size}-maskable.png")

    fit(art, 150).save(PUBLIC / "mstile-150x150.png")

    og = Image.new("RGBA", (1200, 630), CREAM)
    plate = art.resize((520, 520), Image.LANCZOS)
    og.alpha_composite(plate, ((1200 - 520) // 2, (630 - 520) // 2))
    og.convert("RGB").save(PUBLIC / "og-image.png")

    print("icons built from", SOURCE.relative_to(ROOT))


if __name__ == "__main__":
    main()
