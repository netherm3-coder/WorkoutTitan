#!/usr/bin/env python3
"""
Makes the screenshots and the feature graphic for the Google Play page.

    python3 scripts/build-store-images.py /tmp/store-screens

Reads  <folder>/<language>/<n>-<screen>.png  raw 1080x1920 screens, from
                                             scripts/capture-store-screens.py or from a phone
       assets/scene                          the camp art, for the feature graphic
       the app's fonts in node_modules       Shantell Sans for words, as on the app's headings
Writes store/screenshots/<language>/<n>-<screen>.jpg   1080x1920, each screen under its caption
       store/feature-graphic.<language>.jpg            1024x500

Both are what Google Play asks for: phone screenshots between 320 and 3840 pixels a side, no
more than twice as long as wide, and a 1024x500 feature graphic, as JPEG or 24-bit PNG. JPEG
keeps the repository small.

The screens sit on the night sky over the camp, lit from below by the fire, so they stand out
from their own dusk background. The captions say in a few words what each screen is for.

Needs Pillow and an installed node_modules. Run it after capturing new screens.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "node_modules" / "@expo-google-fonts"
SCENE = ROOT / "assets" / "scene"
STORE = ROOT / "store"

WIDTH, HEIGHT = 1080, 1920
SCREEN_WIDTH = 860
CORNER = 46

NIGHT_TOP = (30, 25, 41)
NIGHT_BOTTOM = (61, 49, 82)
FIRELIGHT = (236, 150, 112)
WARM_WHITE = (255, 244, 234)
DUSK_PINK = (230, 185, 206)

CAPTIONS = {
    "uk": {
        "home": "Твоя кімната рекордів",
        "records": "Рекорди й цілі в одному місці",
        "workouts": "Графік прогресу кожної вправи",
        "body": "Вага тіла на графіку",
        "bodymap": "Карта пропорцій тіла",
        "achievements": "Досягнення з нагородами",
        "camp": "Вдягни свого лицаря",
    },
    "en": {
        "home": "Your room of records",
        "records": "Records and goals in one place",
        "workouts": "A progress chart for every exercise",
        "body": "Your body weight over time",
        "bodymap": "A map of your body",
        "achievements": "Achievements open new items",
        "camp": "Dress your knight",
    },
}

TAGLINE = {"uk": "Щоденник рекордів", "en": "Personal best log"}

# How wide the camp picture fades into the sky on the feature graphic.
FADE = 70

# The camp on the feature graphic: the look of the demo history the screenshots show.
LOOK = {"sky": "cloudy", "season": "autumn", "tent": "blue", "armour": "yellow", "hat": "bucket"}


def heading(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS / "shantell-sans" / "700Bold" / "ShantellSans_700Bold.ttf"), size)


def body(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS / "nunito" / "600SemiBold" / "Nunito_600SemiBold.ttf"), size)


def night(width: int, height: int, glow_at: tuple[float, float], reach: float) -> Image.Image:
    """The night sky, darker at the top, with the fire's light rising from `glow_at`."""
    sky = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(sky)
    for y in range(height):
        t = y / (height - 1)
        draw.line([(0, y), (width, y)], fill=tuple(round(a + (b - a) * t) for a, b in zip(NIGHT_TOP, NIGHT_BOTTOM)))
    glow = Image.new("L", (width, height), 0)
    rings = ImageDraw.Draw(glow)
    cx, cy = glow_at[0] * width, glow_at[1] * height
    for step in range(int(reach), 0, -6):
        rings.ellipse((cx - step, cy - step, cx + step, cy + step), fill=round(120 * (1 - step / reach) ** 2))
    return Image.composite(Image.new("RGB", (width, height), FIRELIGHT), sky, glow)


def lines_of(text: str, face: ImageFont.FreeTypeFont, width: int) -> list[str]:
    """The caption broken into lines no wider than `width`, words kept whole."""
    lines: list[str] = []
    for word in text.split():
        if lines and face.getlength(f"{lines[-1]} {word}") <= width:
            lines[-1] = f"{lines[-1]} {word}"
        else:
            lines.append(word)
    return lines


def rounded(image: Image.Image, radius: int) -> Image.Image:
    mask = Image.new("L", image.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, image.width - 1, image.height - 1), radius=radius, fill=255)
    out = image.convert("RGBA")
    out.putalpha(mask)
    return out


def screenshot(raw: Path, caption: str) -> Image.Image:
    canvas = night(WIDTH, HEIGHT, (0.5, 1.02), HEIGHT * 0.75).convert("RGBA")

    screen = Image.open(raw).convert("RGB")
    scaled = screen.resize((SCREEN_WIDTH, round(screen.height * SCREEN_WIDTH / screen.width)), Image.LANCZOS)
    left = (WIDTH - scaled.width) // 2
    top = HEIGHT - scaled.height - 64

    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        (left, top + 24, left + scaled.width, top + 24 + scaled.height), radius=CORNER, fill=(10, 6, 16, 150)
    )
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(36)))
    canvas.alpha_composite(rounded(scaled, CORNER), (left, top))
    ImageDraw.Draw(canvas).rounded_rectangle(
        (left, top, left + scaled.width - 1, top + scaled.height - 1), radius=CORNER, outline=(*WARM_WHITE, 46), width=3
    )

    # Two lines at most: a longer caption gets a smaller face instead of a third line.
    size = 80
    face = heading(size)
    lines = lines_of(caption, face, WIDTH - 140)
    while len(lines) > 2 and size > 60:
        size -= 4
        face = heading(size)
        lines = lines_of(caption, face, WIDTH - 140)
    line_height = round(size * 1.2)
    block = line_height * len(lines)
    y = (top - block) // 2 - 6
    draw = ImageDraw.Draw(canvas)
    for line in lines:
        draw.text((WIDTH / 2, y + line_height / 2), line, font=face, fill=WARM_WHITE, anchor="mm")
        y += line_height
    return canvas.convert("RGB")


def camp() -> Image.Image:
    """The camp scene in the demo look, as the app stacks it."""
    def layer(path: Path, frame: int = 0) -> Image.Image:
        with Image.open(path) as picture:
            if getattr(picture, "n_frames", 1) > 1:
                picture.seek(frame)
            return picture.convert("RGBA")

    scene = layer(SCENE / "sky" / f"{LOOK['sky']}-{LOOK['season']}.webp")
    for part in (
        layer(SCENE / "tent" / f"{LOOK['tent']}-{LOOK['season']}.webp"),
        layer(SCENE / "knight" / f"{LOOK['armour']}.gif"),
        layer(SCENE / "hat" / f"{LOOK['hat']}.webp"),
        layer(SCENE / "campfire.gif", 1),
    ):
        scene.alpha_composite(part)
    return scene


def feature_graphic(language: str) -> Image.Image:
    width, height = 1024, 500
    canvas = night(width, height, (0.72, 1.1), width * 0.6).convert("RGBA")

    scene = camp()
    scene = scene.resize((round(scene.width * height / scene.height), height), Image.LANCZOS)
    scene = scene.crop((40, 0, scene.width - 30, height))
    # Fade the left edge of the picture into the sky, so text and camp share one night. The fade
    # stops short of the knight.
    fade = Image.new("L", scene.size, 255)
    ramp = ImageDraw.Draw(fade)
    for x in range(FADE):
        ramp.line([(x, 0), (x, height)], fill=round(255 * (x / FADE) ** 1.5))
    scene.putalpha(Image.composite(scene.getchannel("A"), Image.new("L", scene.size, 0), fade))
    canvas.alpha_composite(scene, (width - scene.width, 0))

    draw = ImageDraw.Draw(canvas)
    draw.text((60, 215), "Record", font=heading(104), fill=WARM_WHITE, anchor="ls")
    draw.text((64, 270), TAGLINE[language], font=body(36), fill=DUSK_PINK, anchor="ls")
    return canvas.convert("RGB")


def save(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, quality=90, subsampling=0, optimize=True)
    print(f"{path.relative_to(ROOT)}  {image.width}x{image.height}  {path.stat().st_size // 1024} KB")


def main(raw: Path) -> None:
    for language, captions in CAPTIONS.items():
        for screen in sorted((raw / language).glob("*.png")):
            name = screen.stem.split("-", 1)[1]
            save(screenshot(screen, captions[name]), STORE / "screenshots" / language / f"{screen.stem}.jpg")
        save(feature_graphic(language), STORE / f"feature-graphic.{language}.jpg")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(Path(sys.argv[1]))
