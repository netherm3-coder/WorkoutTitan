import type { LegacyWorkout } from '../legacy/convert';

/** A small seeded generator, so the same "random" history is made on every run. */
function makeRandom(seed: number) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
  return {
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)] as T,
    chance: (probability: number) => next() < probability,
  };
}

const pad = (value: number) => String(value).padStart(2, '0');
const clock = (totalSeconds: number) => `${Math.floor(totalSeconds / 60)}:${pad(totalSeconds % 60)}`;
const longClock = (totalSeconds: number) =>
  `${Math.floor(totalSeconds / 3600)}:${pad(Math.floor((totalSeconds % 3600) / 60))}:${pad(totalSeconds % 60)}`;

const FIRST_DAY = Date.UTC(2025, 0, 1);
const DAYS = 669; // up to 31 October 2026
const dayAt = (offset: number) => new Date(FIRST_DAY + offset * 86_400_000).toISOString().slice(0, 10);

/** Record's weigh-ins, newest first, the way the web app keeps them. */
export const RECORD_WEIGHTS = [
  { date: '2026-09-01', weight: 79.5 },
  { date: '2026-05-10', weight: 82 },
  { date: '2026-01-15', weight: 84 },
  { date: '2025-08-20', weight: 80.5 },
  { date: '2025-03-01', weight: 78 },
];

export type RecordWorkout = LegacyWorkout & { id: string; createdAt: number };

/** What a workout is, for tests that only compare some kinds. */
export type Family = 'classic' | 'race' | 'customTime' | 'customDistance' | 'customNumber' | 'bench';

export function familyOf(exercise: string): Family {
  if (['Підтягування', 'Відтискання', 'Бруси'].includes(exercise)) return 'classic';
  if (/^(Біг|Спринт|Човниковий біг)(\s|$)/.test(exercise)) return 'race';
  if (exercise === 'Жим лежачи') return 'bench';
  if (exercise === 'Смуга перешкод') return 'customTime';
  if (exercise.startsWith('Марш-кидок')) return 'customDistance';
  return 'customNumber';
}

/**
 * A history written exactly the way Record's form writes results, old formats included.
 * Timed sets without a load ("12 (0:41)") are left out on purpose: Record ranks those as runs,
 * which is one of the differences the tests spell out separately.
 */
export function makeRecordHistory(seed: number, size: number): RecordWorkout[] {
  const random = makeRandom(seed);
  const workouts: RecordWorkout[] = [];

  const makers: (() => { exercise: string; count: string })[] = [
    // Pull-ups, push-ups, dips: "12", "12 (+20 кг)", "12 (+20 кг) (0:41)".
    () => {
      const exercise = random.pick(['Підтягування', 'Підтягування', 'Відтискання', 'Бруси']);
      const reps = random.int(1, exercise === 'Відтискання' ? 60 : 25);
      if (random.chance(0.5)) return { exercise, count: String(reps) };

      const load = random.pick([5, 7.5, 10, 12.5, 15, 20, 25, 30, 40]);
      const time = random.chance(0.3) ? ` (${clock(random.int(15, 150))})` : '';
      return { exercise, count: `${reps} (+${load} кг)${time}` };
    },
    // Runs: "24:30 (5 км)" under "Біг 5 км"; old ones "5 км (25:00)" under "Біг".
    () => {
      const km = random.pick([1, 3, 5, 10]);
      const time = clock(Math.round(km * random.int(210, 360)));
      return random.chance(0.25)
        ? { exercise: 'Біг', count: `${km} км (${time})` }
        : { exercise: `Біг ${km} км`, count: `${time} (${km} км)` };
    },
    // Sprints: "12.5 с (100 м)" under "Спринт 100 м"; old ones "100 м (12.5 с)" under "Спринт".
    () => {
      const metres = random.pick([60, 100, 400]);
      const secondsTaken = String(Math.round(metres * random.int(120, 190)) / 1000);
      return random.chance(0.25)
        ? { exercise: 'Спринт', count: `${metres} м (${secondsTaken} с)` }
        : { exercise: `Спринт ${metres} м`, count: `${secondsTaken} с (${metres} м)` };
    },
    // Shuttle runs: "0:09.80 (4×9м)"; old ones "10х10 м (24.5 с)" under the bare name.
    () => {
      if (random.chance(0.3)) {
        return { exercise: 'Човниковий біг', count: `10х10 м (${random.int(230, 290) / 10} с)` };
      }
      const scheme = random.pick(['4×9м', '6×100м']);
      const hundredths = scheme === '4×9м' ? random.int(880, 1150) : random.int(10_500, 13_500);
      const whole = Math.floor(hundredths / 100);
      return { exercise: `Човниковий біг ${scheme}`, count: `${clock(whole)}.${pad(hundredths % 100)} (${scheme})` };
    },
    // Custom exercises: a number with a unit, a bare time, a distance against the clock.
    () => ({ exercise: 'Присідання', count: `${random.int(40, 160)} кг` }),
    () => ({ exercise: 'Смуга перешкод', count: clock(random.int(95, 400)) }),
    () => {
      const km = random.pick([10, 30]);
      return { exercise: `Марш-кидок ${km} км`, count: longClock(Math.round(km * random.int(420, 620))) };
    },
    () => ({ exercise: 'Жим лежачи', count: `${random.int(1, 10)} (+${random.pick([60, 70, 80, 90, 100, 110])} кг)` }),
  ];

  for (let index = 0; index < size; index += 1) {
    // Classics and runs are logged most often, as in real use.
    const maker = makers[random.pick([0, 0, 0, 0, 1, 1, 1, 2, 3, 4, 5, 6, 7])];
    if (!maker) throw new Error('no maker');

    const date = dayAt(random.int(0, DAYS - 1));
    const [year, month, day] = date.split('-').map(Number);
    workouts.push({
      id: `w${index}`,
      ...maker(),
      date,
      createdAt: new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1, 8, 0, index).getTime(),
    });
  }

  return workouts;
}
