#!/usr/bin/env python3
"""
Builds the app icon, the splash picture and the store icon from WorkoutTitan's campfire.

    python3 scripts/build-icons.py

Reads  assets/AppAssets/Campsite/Campfire.gif (WorkoutTitan's art, left exactly as it was)
Writes assets/images/icon.png                 full square, for iOS and as the source of the rest
       assets/images/adaptive-icon.png        Android: the fire on a transparent layer
       assets/images/adaptive-icon-background.png  Android: the dusk behind it
       assets/images/adaptive-icon-monochrome.png  Android 13+: the fire in one colour, for themed icons
       assets/images/splash-icon.png          the fire alone, centred on the splash colour
       assets/images/favicon.png              the web build
       store/icon-512.png                     the icon Google Play asks for

The background is the dusk of the default skin, darker at the top, with the fire's glow on it.
The fire is the second frame of the campfire animation, the most even one.

Android shows only the middle two thirds of an adaptive icon layer and then cuts it to the
launcher's shape, so there the fire is drawn smaller than on the full square.

Needs Pillow. Run it again only when the art or the layout here changes; the result is committed.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
FIRE = ROOT / "assets" / "AppAssets" / "Campsite" / "Campfire.gif"
IMAGES = ROOT / "assets" / "images"
STORE = ROOT / "store"

SIZE = 1024
FRAME = 1

# The dusk of the default skin (src/theme/themes.ts), darkened so the fire stands out.
TOP = (52, 44, 70)
BOTTOM = (112, 82, 136)
GLOW = (236, 150, 112)

# How tall the fire is, as a share of the side, and where its middle sits.
FULL = (0.62, 0.53)  # the full square: iOS, the store, the web
ADAPTIVE = (0.48, 0.52)  # inside Android's safe zone, a circle two thirds of the side wide
SPLASH = (0.58, 0.5)

# Pixels this dark are the outlines of the art; the one-colour icon leaves them out.
OUTLINE = 70


def fire() -> Image.Image:
    with Image.open(FIRE) as gif:
        gif.seek(FRAME)
        frame = gif.convert("RGBA")
    return frame.crop(frame.getbbox())


def placed(art: Image.Image, share: float, middle: float) -> Image.Image:
    """The art on a transparent square, `share` of the side tall, its middle at `middle`."""
    height = round(SIZE * share)
    width = round(art.width * height / art.height)
    layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    layer.alpha_composite(art.resize((width, height), Image.LANCZOS), ((SIZE - width) // 2, round(SIZE * middle - height / 2)))
    return layer


def dusk() -> Image.Image:
    """The background: a top-to-bottom dusk with a warm glow where the fire is."""
    sky = Image.new("RGB", (SIZE, SIZE))
    draw = ImageDraw.Draw(sky)
    for y in range(SIZE):
        t = y / (SIZE - 1)
        draw.line([(0, y), (SIZE, y)], fill=tuple(round(a + (b - a) * t) for a, b in zip(TOP, BOTTOM)))

    glow = Image.new("L", (SIZE, SIZE), 0)
    rings = ImageDraw.Draw(glow)
    reach = SIZE * 0.5
    centre = (SIZE / 2, SIZE * 0.58)
    for step in range(int(reach), 0, -4):
        strength = (1 - step / reach) ** 2
        rings.ellipse(
            (centre[0] - step, centre[1] - step, centre[0] + step, centre[1] + step),
            fill=round(150 * strength),
        )
    return Image.composite(Image.new("RGB", (SIZE, SIZE), GLOW), sky, glow).convert("RGBA")


def monochrome(layer: Image.Image) -> Image.Image:
    """The fire in white, outlines cut out, so the shapes read in a single colour."""
    pixels = layer.load()
    out = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    target = out.load()
    for y in range(layer.height):
        for x in range(layer.width):
            r, g, b, a = pixels[x, y]
            if a and (r * 299 + g * 587 + b * 114) // 1000 > OUTLINE:
                target[x, y] = (255, 255, 255, a)
    return out


def save(image: Image.Image, path: Path, size: int = SIZE, opaque: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    picture = image if size == SIZE else image.resize((size, size), Image.LANCZOS)
    if opaque:
        picture = picture.convert("RGB")
    picture.save(path, optimize=True)
    print(f"{path.relative_to(ROOT)}  {size}x{size}")


def main() -> None:
    art = fire()
    background = dusk()

    full = background.copy()
    full.alpha_composite(placed(art, *FULL))
    save(full, IMAGES / "icon.png", opaque=True)
    save(full, IMAGES / "favicon.png", 48, opaque=True)
    save(full, STORE / "icon-512.png", 512, opaque=True)

    foreground = placed(art, *ADAPTIVE)
    save(foreground, IMAGES / "adaptive-icon.png")
    save(background, IMAGES / "adaptive-icon-background.png", opaque=True)
    save(monochrome(foreground), IMAGES / "adaptive-icon-monochrome.png")

    save(placed(art, *SPLASH), IMAGES / "splash-icon.png")


if __name__ == "__main__":
    main()
