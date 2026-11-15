#!/usr/bin/env python3
"""
Builds the made-up history the store screenshots are taken with.

    python3 scripts/build-demo-backup.py [--today 2026-11-15]

Writes store/demo-backup.uk.json and store/demo-backup.en.json: backup files (docs/backup.md)
of eight months of training by a person who does not exist, ending on `--today`. The two files
differ only in the names of the person's own exercises, so each language's screenshots show
text in that language. Restoring one on a phone adds its entries to whatever is there, so it is
for a phone or a browser with nothing in it.

The numbers rise over the months with some noise, as a real history would, and the last weeks
hold fresh records, so the screens show records of different ages. The same `--today` gives the
same files: the noise comes from a fixed seed.

Needs only Python. A test (src/__tests__/demoBackup.test.ts) reads both files the way the app
reads a backup, so a file this script writes can always be restored.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STORE = ROOT / "store"

DAYS = 240
SEED = 7

OWN = {
    "uk": {"plank": "Планка", "rope": "Скакалка", "ropeUnit": "разів"},
    "en": {"plank": "Plank", "rope": "Jump rope", "ropeUnit": "jumps"},
}

MEASURES = ("reps", "loadKg", "durationMs", "distanceM", "segments", "value", "text")


def ms(minutes: int, seconds: float) -> int:
    return round((minutes * 60 + seconds) * 1000)


class History:
    def __init__(self, today: dt.date) -> None:
        self.today = today
        self.start = today - dt.timedelta(days=DAYS)
        self.rng = random.Random(SEED)
        self.entries: list[dict] = []

    def progress(self, day: dt.date) -> float:
        """0 on the first day, 1 today."""
        return (day - self.start).days / DAYS

    def between(self, day: dt.date, first: float, last: float, noise: float = 0.0) -> float:
        value = first + (last - first) * self.progress(day)
        return value + self.rng.uniform(-noise, noise)

    def log(self, exercise: str, day: dt.date, **measures: float | int | None) -> None:
        number = len(self.entries) + 1
        written = dt.datetime.combine(day, dt.time(19, 0)) + dt.timedelta(minutes=number % 50)
        entry = {
            "id": f"demo-{number:04d}",
            "exerciseId": exercise,
            "date": day.isoformat(),
            "createdAt": int(written.replace(tzinfo=dt.timezone.utc).timestamp() * 1000),
            "note": "",
            "videoUrl": "",
            "resultUrl": "",
        }
        entry.update({key: measures.get(key) for key in MEASURES})
        self.entries.append(entry)


def build(today: dt.date, language: str) -> dict:
    history = History(today)
    names = OWN[language]

    day = history.start
    session = 0
    while day <= today:
        # Three workouts a week, Monday, Wednesday and Friday, with a week off in the summer.
        off = dt.date(today.year, 7, 14) <= day <= dt.date(today.year, 7, 20)
        if day.weekday() in (0, 2, 4) and not off:
            kind = session % 3
            session += 1
            if kind == 0:
                for _ in range(2):
                    history.log("pullups", day, reps=round(history.between(day, 8, 16.6, 1.2)))
                history.log("dips", day, reps=round(history.between(day, 15, 27, 1.5)))
                load = round(history.between(day, 60, 95, 1.5) / 2.5) * 2.5
                history.log("benchPress", day, loadKg=load, reps=round(history.between(day, 8, 4, 0.6)))
            elif kind == 1:
                history.log("pushups", day, reps=round(history.between(day, 30, 54, 2)))
                history.log(
                    "run",
                    day,
                    distanceM=5000,
                    durationMs=ms(0, round(history.between(day, 27 * 60 + 40, 23 * 60 + 25, 25))),
                )
                history.log("own:demo-plank", day, durationMs=ms(0, round(history.between(day, 90, 195, 8))))
            else:
                history.log("sprint", day, distanceM=100, durationMs=ms(0, round(history.between(day, 15.4, 13.9, 0.15), 1)))
                history.log(
                    "shuttle",
                    day,
                    distanceM=10,
                    segments=10,
                    durationMs=ms(0, round(history.between(day, 27.8, 25.2, 0.3), 1)),
                )
                history.log("own:demo-rope", day, value=round(history.between(day, 150, 380, 15), -1))
            # A 1 km time trial on the first Saturday of each month.
        if day.weekday() == 5 and day.day <= 7:
            history.log("run", day, distanceM=1000, durationMs=ms(0, round(history.between(day, 255, 214, 3))))
        day += dt.timedelta(days=1)

    # The highlights of the last weeks: a first hundred on the bench, a best set of pull-ups.
    history.log("benchPress", today - dt.timedelta(days=9), loadKg=100, reps=1)
    history.log("pullups", today - dt.timedelta(days=2), reps=18)

    weights = []
    weigh = history.start
    while weigh <= today:
        weights.append({"date": weigh.isoformat(), "kg": round(history.between(weigh, 82.4, 78.6, 0.35), 1)})
        weigh += dt.timedelta(days=7)

    measurements = []
    month = history.start
    while month <= today:
        for part, first, last in (("waist", 88, 82.5), ("chest", 101, 104.5), ("bicep", 36, 38.5)):
            measurements.append({"date": month.isoformat(), "part": part, "cm": round(history.between(month, first, last, 0.3), 1)})
        month += dt.timedelta(days=30)

    return {
        "format": "record-backup",
        "version": 1,
        "exportedAt": dt.datetime.combine(today, dt.time(20, 0)).replace(tzinfo=dt.timezone.utc).isoformat().replace("+00:00", ".000Z"),
        "appVersion": None,
        "exercises": [
            {"id": "own:demo-plank", "kind": "duration", "better": "higher", "name": names["plank"], "unit": None, "distanceUnit": None},
            {"id": "own:demo-rope", "kind": "count", "better": "higher", "name": names["rope"], "unit": names["ropeUnit"], "distanceUnit": None},
        ],
        "entries": history.entries,
        "bodyWeights": weights,
        "bodyMeasurements": measurements,
        "bodyParts": [],
        "goals": [
            {"discipline": "pullups", "target": 20},
            {"discipline": "benchPress", "target": 110},
            {"discipline": "run@5000", "target": ms(22, 0)},
        ],
        "profile": {"heightCm": 181, "trainingSince": (today - dt.timedelta(days=620)).isoformat(), "soberSince": None},
        "look": {
            "armour": "yellow",
            "hat": "bucket",
            "tent": "blue",
            "pattern": None,
            "patternColour": "red",
            "sky": "cloudy",
            "season": "autumn",
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--today", type=dt.date.fromisoformat, default=dt.date.today())
    today = parser.parse_args().today
    for language in OWN:
        path = STORE / f"demo-backup.{language}.json"
        path.write_text(json.dumps(build(today, language), ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        print(f"{path.relative_to(ROOT)}  {today}")


if __name__ == "__main__":
    main()
