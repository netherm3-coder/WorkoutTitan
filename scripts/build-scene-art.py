#!/usr/bin/env python3
"""
Builds the camp scene art the app ships from WorkoutTitan's originals.

    python3 scripts/build-scene-art.py

Reads  assets/AppAssets (WorkoutTitan's art, left exactly as it was)
Writes assets/scene      (what the app bundles)
       src/cosmetics/art.ts (the table that maps a look to these files)

Why a copy instead of using the originals in place: the originals are PNGs of about 40 MB for
this one scene, with names like "Copy of F.B.png". The copies are WebP of about a fifth of
that, named by the ids the catalogue in src/domain/cosmetics uses.

Needs Pillow with WebP support. Run it again only when the originals or the ids change; the
result is committed.
"""

from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets" / "AppAssets"
CAMP = SOURCE / "Campsite" / "CleaningIdle"
REVEALS = SOURCE / "Unlocks" / "Reveals"
TARGET = ROOT / "assets" / "scene"
TABLE = ROOT / "src" / "cosmetics" / "art.ts"

# id in the catalogue -> the code or name WorkoutTitan used in its file names.
COLOURS = {
    "gray": "Gr",
    "black": "Bl",
    "blue": "B",
    "brown": "Br",
    "green": "G",
    "lightBlue": "L",
    "orange": "O",
    "pink": "Pi",
    "purple": "P",
    "red": "R",
    "white": "W",
    "yellow": "Y",
}
KNIGHTS = {
    "gray": "Gray",
    "black": "Black",
    "blue": "Blue",
    "brown": "Brown",
    "green": "Green",
    "lightBlue": "L.Blue",
    "orange": "Orange",
    "pink": "Pink",
    "purple": "Purple",
    "red": "Red",
    "white": "White",
    "yellow": "Yellow",
}
SKIES = {"sunny": "S", "cloudy": "Sc", "rain": "Rc", "sunset": "Ss", "starry": "St"}
# The season is drawn twice: as the ground (first code) and as the leaves (second code).
SEASONS = {
    "bare": ("N", "Non"),
    "summer": ("S", "S"),
    "autumn": ("A", "A"),
    "cherry": ("C", "C"),
    "winter": ("W", "W"),
}
TENTS = {"canvas": "Non", **COLOURS}
PATTERNS = {
    "dots": "D",
    "stripes": "Copy of S",
    "waves": "W",
    "flowers": "Copy of F",
    "stars": "St",
    "hearts": "H",
}
# id -> (name of the layer drawn on the knight, name of the picture for the list)
HATS = {
    "sprout": ("Leaf", "Leaf"),
    "beanie": ("Beanie", "Beanie"),
    "baseballCap": ("BaseballCap", "BaseballCap"),
    "beret": ("Beret", "Beret"),
    "bucketHat": ("BucketHat", "BucketHat"),
    "cowboy": ("Cowboy", "Cowboy"),
    "ushanka": ("Russian", "RussianHat"),
    "raccoon": ("Raccoon", "Raccoon"),
    "flowerCrown": ("FlowerCrown", "FlowerCrown"),
    "partyHat": ("Party", "Party"),
    "propeller": ("Propeller", "Propeller"),
    "paperBoat": ("Paper", "PaperHat"),
    "bucket": ("Bucket", "Bucket"),
    "pot": ("Pan", "Pan"),
    "egg": ("Egg", "Egg"),
    "crown": ("Crown", "Crown"),
    "topHat": ("TopHat", "TopHat"),
    "headphones": ("Headphones", "Headphones"),
    "catEars": ("CatEars", "CatEars"),
    "duck": ("Duck", "Duck"),
}

# Where the tile sits inside WorkoutTitan's 768x1024 "reveal" pictures.
TILE_BOX = (107, 234, 630, 757)
TILE_SIZE = 192


def painted(source: Path, target: Path) -> None:
    """Textured art: lossy WebP. The alpha channel stays exact."""
    target.parent.mkdir(parents=True, exist_ok=True)
    Image.open(source).save(target, "WEBP", quality=90, method=6)


def flat(source: Path, target: Path) -> None:
    """Flat-colour art: lossless WebP is both exact and smaller here."""
    target.parent.mkdir(parents=True, exist_ok=True)
    Image.open(source).save(target, "WEBP", lossless=True, method=6)


def tile(source: Path, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    picture = Image.open(source).convert("RGBA").crop(TILE_BOX)
    picture = picture.resize((TILE_SIZE, TILE_SIZE), Image.LANCZOS)
    picture.save(target, "WEBP", quality=90, method=6)


def copied(source: Path, target: Path) -> None:
    """Animations stay GIF: that is what React Native plays on every platform."""
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, target)


def build_art() -> None:
    if TARGET.exists():
        shutil.rmtree(TARGET)

    copied(SOURCE / "Campsite" / "Campfire.gif", TARGET / "campfire.gif")

    for sky, sky_code in SKIES.items():
        for season, (ground_code, _) in SEASONS.items():
            painted(CAMP / "GroundAndSky" / f"{sky_code}.{ground_code}.png", TARGET / "sky" / f"{sky}-{season}.webp")

    for tent, tent_code in TENTS.items():
        for season, (_, leaves_code) in SEASONS.items():
            painted(CAMP / "TentAndLeaves" / f"{tent_code}.{leaves_code}.png", TARGET / "tent" / f"{tent}-{season}.webp")

    for pattern, pattern_code in PATTERNS.items():
        for colour, colour_code in COLOURS.items():
            flat(CAMP / "TentPatterns" / f"{pattern_code}.{colour_code}.png", TARGET / "pattern" / f"{pattern}-{colour}.webp")

    for colour, name in KNIGHTS.items():
        copied(CAMP / "Knight" / f"{name}.gif", TARGET / "knight" / f"{colour}.gif")

    for hat, (layer, reveal) in HATS.items():
        flat(CAMP / "Knight" / "Hats" / f"{layer}.png", TARGET / "hat" / f"{hat}.webp")
        tile(REVEALS / f"{reveal}.png", TARGET / "hat-tile" / f"{hat}.webp")


def record(name: str, entries: list[tuple[str, str]], indent: str = "  ") -> list[str]:
    lines = [f"{indent}{name}: {{"]
    lines += [f"{indent}  {key}: require('@/assets/scene/{path}')," for key, path in entries]
    lines.append(f"{indent}}},")
    return lines


def build_table() -> None:
    lines = [
        "/*",
        " * Written by scripts/build-scene-art.py together with the files in assets/scene.",
        " * Do not edit by hand: change the script and run it again.",
        " */",
        "import type { ImageSourcePropType } from 'react-native';",
        "",
        "import type { Colour, Hat, Pattern, Season, Sky, Tent } from '@/domain';",
        "",
        "type Pictures<Key extends string> = Record<Key, ImageSourcePropType>;",
        "",
        "/** The fire in front of everything; it is the same in every look. */",
        "export const CAMPFIRE: ImageSourcePropType = require('@/assets/scene/campfire.gif');",
        "",
        "/** The sky and the ground under it. */",
        "export const SKY_ART = {",
    ]
    for sky in SKIES:
        lines += record(sky, [(season, f"sky/{sky}-{season}.webp") for season in SEASONS])
    lines += ["} satisfies Record<Sky, Pictures<Season>>;", "", "/** The tent, the log and the two trees with their leaves. */", "export const TENT_ART = {"]
    for tent in TENTS:
        lines += record(tent, [(season, f"tent/{tent}-{season}.webp") for season in SEASONS])
    lines += ["} satisfies Record<Tent, Pictures<Season>>;", "", "/** The print on the tent. */", "export const PATTERN_ART = {"]
    for pattern in PATTERNS:
        lines += record(pattern, [(colour, f"pattern/{pattern}-{colour}.webp") for colour in COLOURS])
    lines += ["} satisfies Record<Pattern, Pictures<Colour>>;", "", "/** The knight, animated, in each colour of armour. */", "export const KNIGHT_ART = {"]
    lines += [f"  {colour}: require('@/assets/scene/knight/{colour}.gif')," for colour in KNIGHTS]
    lines += ["} satisfies Pictures<Colour>;", "", "/** A hat as it sits on the knight. */", "export const HAT_ART = {"]
    lines += [f"  {hat}: require('@/assets/scene/hat/{hat}.webp')," for hat in HATS]
    lines += ["} satisfies Pictures<Hat>;", "", "/** A hat as a picture for the list: on the knight it is too small to tell apart. */", "export const HAT_TILES = {"]
    lines += [f"  {hat}: require('@/assets/scene/hat-tile/{hat}.webp')," for hat in HATS]
    lines += ["} satisfies Pictures<Hat>;", ""]

    TABLE.parent.mkdir(parents=True, exist_ok=True)
    TABLE.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    build_art()
    build_table()
    files = [path for path in TARGET.rglob("*") if path.is_file()]
    print(f"{len(files)} files, {sum(path.stat().st_size for path in files) / 1_000_000:.1f} MB in {TARGET.relative_to(ROOT)}")
