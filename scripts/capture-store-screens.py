#!/usr/bin/env python3
"""
Takes the raw screens for the Google Play page from the web build of the app.

    python3 scripts/capture-store-screens.py http://localhost:8080 /tmp/store-screens

The first argument is a served web export of the app (see "Web preview" in README.md); the
second is where the raw PNGs go. For each language the script opens the app in a phone-sized
browser window (360x640 points at 3x, which gives 1080x1920), restores the demo history
(store/demo-backup.<language>.json, from scripts/build-demo-backup.py) through the backup
screen like a person would, and photographs seven screens. scripts/build-store-images.py then
puts captions on them.

The web build draws the same React Native screens as the phone, with the same fonts and art; it
only lacks Android's status and navigation bars. Screenshots from a phone are still the better
source once a build is installed: send them through the same build-store-images.py.

Needs Playwright for Python and Chrome. Neither is part of the project.
"""

from __future__ import annotations

import sys
from pathlib import Path

from playwright.sync_api import Page, sync_playwright

ROOT = Path(__file__).resolve().parent.parent

LANGUAGES = {
    "uk": {
        "locale": "uk-UA",
        "home": "Кімната рекордів",
        "settings": "Налаштування",
        "backup": "Резервна копія",
        "choose": "Вибрати файл",
        "add": "Додати дані з файлу",
        "done": "Готово.",
        "hide": "Сховати",
        "back": "Назад",
        "tabs": {"workouts": "Тренування", "body": "Тіло", "achievements": "Досягнення", "home": "Головна"},
        "camp": "Змінити вигляд табору",
        "campTitle": "Вигляд табору",
        "pullups": "Підтягування",
        "weightTrend": "Динаміка ваги",
        "bodyMap": "Карта пропорцій",
    },
    "en": {
        "locale": "en-US",
        "home": "Room of Records",
        "settings": "Settings",
        "backup": "Backup",
        "choose": "Choose a file",
        "add": "Add the data from the file",
        "done": "Done.",
        "hide": "Hide",
        "back": "Back",
        "tabs": {"workouts": "Workouts", "body": "Body", "achievements": "Awards", "home": "Home"},
        "camp": "Change how the camp looks",
        "campTitle": "Camp look",
        "pullups": "Pull-ups",
        "weightTrend": "Weight trend",
        "bodyMap": "Body map",
    },
}


# How far to scroll Home, in points, from the camp down to the sporting status and the podium.
RECORDS_OFFSET = 520


def scroll(page: Page, points: int) -> None:
    if points:
        page.mouse.move(180, 320)
        page.mouse.wheel(0, points)
        page.wait_for_timeout(700)


def scroll_to(page: Page, heading: str) -> None:
    """Scrolls until the card with this heading starts near the top of the screen."""
    box = page.get_by_text(heading, exact=True).first.bounding_box()
    if box is None:
        raise RuntimeError(f"No card called {heading!r} on the screen")
    scroll(page, round(box["y"]) - 40)


def settle(page: Page) -> None:
    """Lets pictures load and animations reach a steady frame."""
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(900)


def restore_demo(page: Page, words: dict, language: str) -> None:
    page.get_by_role("tab", name=words["settings"]).click()
    page.get_by_role("link", name=words["backup"]).click()
    with page.expect_file_chooser() as chooser:
        page.get_by_role("button", name=words["choose"]).click()
    chooser.value.set_files(str(ROOT / "store" / f"demo-backup.{language}.json"))
    page.get_by_role("button", name=words["add"]).click()
    page.get_by_text(words["done"]).first.wait_for()
    page.get_by_role("button", name=words["back"]).click()


def capture(base: str, out: Path) -> None:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        for language, words in LANGUAGES.items():
            folder = out / language
            folder.mkdir(parents=True, exist_ok=True)
            context = browser.new_context(
                viewport={"width": 360, "height": 640},
                device_scale_factor=3,
                locale=words["locale"],
                timezone_id="Europe/Kyiv",
            )
            page = context.new_page()
            page.goto(base + "/", wait_until="networkidle")
            page.get_by_role("heading", name=words["home"]).wait_for(timeout=30000)

            restore_demo(page, words, language)

            page.get_by_role("tab", name=words["tabs"]["home"]).click()
            page.get_by_role("heading", name=words["home"]).wait_for()
            # The restore opened a pile of items at once; the card about them is not the point here.
            hide = page.get_by_role("button", name=words["hide"])
            if hide.count():
                hide.first.click()
            settle(page)
            page.screenshot(path=folder / "1-home.png")
            # Further down Home: the sporting status and the podium of records with goals.
            scroll(page, RECORDS_OFFSET)
            page.screenshot(path=folder / "2-records.png")

            # The journal with the pull-ups chosen: their chart, then their sets with the 1RM.
            page.get_by_role("tab", name=words["tabs"]["workouts"]).click()
            page.get_by_role("radio", name=words["pullups"]).first.click()
            settle(page)
            page.screenshot(path=folder / "3-workouts.png")

            # The body, from the weight chart down, and then the body map.
            page.get_by_role("tab", name=words["tabs"]["body"]).click()
            settle(page)
            scroll_to(page, words["weightTrend"])
            page.screenshot(path=folder / "4-body.png")
            scroll_to(page, words["bodyMap"])
            page.screenshot(path=folder / "5-bodymap.png")

            page.get_by_role("tab", name=words["tabs"]["achievements"]).click()
            settle(page)
            page.screenshot(path=folder / "6-achievements.png")

            page.get_by_role("tab", name=words["tabs"]["home"]).click()
            scroll(page, -RECORDS_OFFSET)
            page.get_by_role("button", name=words["camp"]).click()
            page.get_by_role("heading", name=words["campTitle"]).wait_for()
            settle(page)
            page.screenshot(path=folder / "7-camp.png")
            context.close()
            print(f"{language}: {sorted(p.name for p in folder.glob('*.png'))}")
        browser.close()


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    capture(sys.argv[1].rstrip("/"), Path(sys.argv[2]))
