import { BENCH_PRESS, customExercise, NO_MEASURES, PULLUPS, RUN, SHUTTLE, SPRINT, type Measures, type WorkoutEntry } from '@/domain';

import { METRIC, US_UNITS } from '@/format';

import { draftFrom, emptyDraft, fieldsOf, readDraft, type Draft } from '../entryDraft';

const DAY = '2026-11-12';
const draft = (exerciseId: string, typed: Partial<Draft>): Draft => ({ ...emptyDraft(exerciseId, DAY), ...typed });
const m = (measures: Partial<Measures>): Measures => ({ ...NO_MEASURES, ...measures });

const PLANK = customExercise({ id: 'custom:plank', name: 'Планка', kind: 'duration' });
const SQUATS = customExercise({ id: 'custom:squats', name: 'Присідання', kind: 'count', unit: 'кг' });
const NOTES = customExercise({ id: 'custom:notes', name: 'Розтяжка', kind: 'text' });
const SWIM = customExercise({ id: 'custom:swim', name: 'Плавання', kind: 'distanceTime', distanceUnit: 'm' });

const entry = (exerciseId: string, measures: Partial<Measures>): WorkoutEntry => ({
  ...NO_MEASURES,
  ...measures,
  id: 'e',
  exerciseId,
  date: DAY,
  createdAt: 1,
  note: 'нотатка',
  videoUrl: '',
  resultUrl: '',
});

describe('readDraft', () => {
  it.each([
    ['reps', PULLUPS, { reps: '12' }, m({ reps: 12 })],
    ['reps with a load and a time', PULLUPS, { reps: '12', load: '7,5', seconds: '41' }, m({ reps: 12, loadKg: 7.5, durationMs: 41_000 })],
    ['a lift', BENCH_PRESS, { load: '100', reps: '5' }, m({ loadKg: 100, reps: 5 })],
    ['a run in kilometres', RUN, { distance: '5', minutes: '24', seconds: '30' }, m({ distanceM: 5000, durationMs: 1_470_000 })],
    ['a half marathon', RUN, { distance: '21.1', minutes: '105', seconds: '30' }, m({ distanceM: 21_100, durationMs: 6_330_000 })],
    ['a sprint in metres', SPRINT, { distance: '100', seconds: '12,5' }, m({ distanceM: 100, durationMs: 12_500 })],
    ['a swim in metres', SWIM, { distance: '400', minutes: '8', seconds: '5' }, m({ distanceM: 400, durationMs: 485_000 })],
    ['a shuttle run', SHUTTLE, { segments: '4', segmentLength: '9', seconds: '9.8' }, m({ segments: 4, distanceM: 9, durationMs: 9800 })],
    ['a time on its own', PLANK, { minutes: '3' }, m({ durationMs: 180_000 })],
    ['a number', SQUATS, { value: '100' }, m({ value: 100 })],
    ['words', NOTES, { words: '  шпагат майже  ' }, m({ text: 'шпагат майже' })],
  ])('reads %s', (_label, exercise, typed, measures) => {
    expect(readDraft(draft(exercise.id, typed), exercise, METRIC)).toEqual({ measures, problems: [] });
  });

  it('ignores what was typed into fields of another kind of exercise', () => {
    const typed = draft(RUN.id, { reps: '12', load: '20', value: '7', distance: '5', minutes: '25' });
    expect(readDraft(typed, RUN, METRIC).measures).toEqual(m({ distanceM: 5000, durationMs: 1_500_000 }));
  });

  it.each([
    ['a set without reps', PULLUPS, {}, ['repsRequired']],
    ['a lift without anything', BENCH_PRESS, {}, ['loadRequired', 'repsRequired']],
    ['a run without a time', RUN, { distance: '5' }, ['durationRequired']],
    ['a run without a distance', RUN, { minutes: '25' }, ['distanceRequired']],
    ['a shuttle run without a scheme', SHUTTLE, { seconds: '10' }, ['segmentsRequired', 'distanceRequired']],
    ['a time of zero', PLANK, { minutes: '0', seconds: '0' }, ['durationRequired']],
    ['a number left empty', SQUATS, {}, ['valueRequired']],
    ['words left empty', NOTES, { words: '   ' }, ['textRequired']],
  ])('says what is missing in %s', (_label, exercise, typed, problems) => {
    expect(readDraft(draft(exercise.id, typed), exercise, METRIC).problems).toEqual(problems);
  });

  it('points at the field that is not a number, before anything else', () => {
    expect(readDraft(draft(PULLUPS.id, { reps: 'багато', load: '-5' }), PULLUPS, METRIC).problems).toEqual([
      { notANumber: 'reps' },
      { notANumber: 'load' },
    ]);
  });
});

describe('draftFrom', () => {
  it('fills the form so that saving it unchanged gives the same result', () => {
    const cases: [typeof PULLUPS, Partial<Measures>][] = [
      [PULLUPS, { reps: 12, loadKg: 7.5, durationMs: 41_000 }],
      [BENCH_PRESS, { reps: 5, loadKg: 102.5 }],
      [RUN, { distanceM: 21_100, durationMs: 6_330_000 }],
      [SPRINT, { distanceM: 100, durationMs: 12_500 }],
      [SWIM, { distanceM: 400, durationMs: 485_000 }],
      [SHUTTLE, { segments: 4, distanceM: 9, durationMs: 9870 }],
      [PLANK, { durationMs: 180_000 }],
      [SQUATS, { value: 100 }],
      [NOTES, { text: 'шпагат майже' }],
    ];

    for (const [exercise, measures] of cases) {
      for (const language of ['uk', 'en'] as const) {
        const filled = draftFrom(entry(exercise.id, measures), exercise, language, METRIC);
        expect({ id: exercise.id, ...readDraft(filled, exercise, METRIC) }).toEqual({ id: exercise.id, measures: m(measures), problems: [] });
      }
    }
  });

  it('writes decimals the way the language does and keeps the note and the day', () => {
    const filled = draftFrom(entry(PULLUPS.id, { reps: 12, loadKg: 7.5 }), PULLUPS, 'uk', METRIC);
    expect(filled).toMatchObject({ reps: '12', load: '7,5', minutes: '', seconds: '', note: 'нотатка', date: DAY });
  });

  it('leaves the minutes empty for a time under a minute', () => {
    expect(draftFrom(entry(SPRINT.id, { distanceM: 100, durationMs: 12_500 }), SPRINT, 'en', METRIC)).toMatchObject({
      minutes: '',
      seconds: '12.5',
      distance: '100',
    });
  });

  it('drops the old wording of an imported result once it is edited as numbers', () => {
    const imported = entry(PULLUPS.id, { reps: 12, text: '12 (вузький хват)' });
    const filled = draftFrom(imported, PULLUPS, 'uk', METRIC);

    expect(filled.words).toBe('');
    expect(readDraft(filled, PULLUPS, METRIC).measures.text).toBeNull();
  });
});

describe('fieldsOf', () => {
  it('asks each kind of exercise only for what it needs', () => {
    expect(fieldsOf(PULLUPS)).toEqual(['reps', 'load', 'minutes', 'seconds']);
    expect(fieldsOf(RUN)).toEqual(['distance', 'minutes', 'seconds']);
    expect(fieldsOf(NOTES)).toEqual([]);
  });
});

describe('a load in pounds', () => {
  const POUND = 0.45359237;

  it('is typed in pounds and kept in kilograms', () => {
    const { measures } = readDraft(draft(BENCH_PRESS.id, { load: '225', reps: '5' }), BENCH_PRESS, US_UNITS);

    expect(measures.loadKg).toBeCloseTo(225 * POUND, 10);
    expect(measures.reps).toBe(5);
  });

  it('fills the form in pounds', () => {
    expect(draftFrom(entry(BENCH_PRESS.id, { loadKg: 225 * POUND, reps: 5 }), BENCH_PRESS, 'en', US_UNITS)).toMatchObject({
      load: '225',
      reps: '5',
    });
    expect(draftFrom(entry(BENCH_PRESS.id, { loadKg: 82.5, reps: 5 }), BENCH_PRESS, 'uk', US_UNITS)).toMatchObject({ load: '181,9' });
  });

  it('keeps its exact weight when saved back untouched', () => {
    // 82.5 kg shows as 181.9 lb; read back from those digits it would be 82.508 kg.
    const filled = draftFrom(entry(BENCH_PRESS.id, { loadKg: 82.5, reps: 5 }), BENCH_PRESS, 'en', US_UNITS);

    expect(readDraft({ ...filled, reps: '6' }, BENCH_PRESS, US_UNITS).measures).toMatchObject({ loadKg: 82.5, reps: 6 });
  });

  it('keeps its exact weight in kilograms too, past the two decimals shown', () => {
    const filled = draftFrom(entry(BENCH_PRESS.id, { loadKg: 225 * POUND, reps: 5 }), BENCH_PRESS, 'en', METRIC);

    expect(filled.load).toBe('102.06');
    expect(readDraft(filled, BENCH_PRESS, METRIC).measures.loadKg).toBe(225 * POUND);
  });

  it('is read from the digits once it is changed', () => {
    const filled = draftFrom(entry(BENCH_PRESS.id, { loadKg: 82.5, reps: 5 }), BENCH_PRESS, 'en', US_UNITS);

    expect(readDraft({ ...filled, load: '185' }, BENCH_PRESS, US_UNITS).measures.loadKg).toBeCloseTo(185 * POUND, 10);
  });

  it('is gone when the field is emptied', () => {
    const filled = draftFrom(entry(PULLUPS.id, { reps: 12, loadKg: 10 }), PULLUPS, 'en', US_UNITS);

    expect(readDraft({ ...filled, load: '' }, PULLUPS, US_UNITS).measures.loadKg).toBeNull();
  });

  it('has nothing to keep in a new entry', () => {
    expect(emptyDraft(PULLUPS.id, DAY).loadAsFilled).toBeNull();
  });
});

