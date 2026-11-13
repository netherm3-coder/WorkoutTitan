import {
  entryProblems,
  NO_MEASURES,
  roundMetres,
  type Day,
  type EntryProblem,
  type Exercise,
  type Measures,
  type WorkoutEntry,
} from '@/domain';
import { formatNumber, joinDuration, parseDecimal, splitDuration, weightField, weightFrom, type Units } from '@/format';
import type { Language } from '@/i18n';

/** The number fields of the form. Which of them are shown depends on the kind of exercise. */
export const NUMBER_FIELDS = ['reps', 'load', 'minutes', 'seconds', 'distance', 'segments', 'segmentLength', 'value'] as const;
export type NumberField = (typeof NUMBER_FIELDS)[number];

/** A result while it is being typed: everything is still text. */
export type Draft = Record<NumberField, string> & {
  exerciseId: string;
  date: Day;
  words: string;
  note: string;
  /**
   * The load as the form was filled with it. Shown in pounds, 82.5 kg reads "181.9"; saved back
   * untouched it must stay 82.5 kg, not become 181.9 lb = 82.51 kg.
   */
  loadAsFilled: { text: string; kg: number } | null;
};

export type DraftProblem = EntryProblem | { notANumber: NumberField };

const BLANK_FIELDS: Record<NumberField, string> = {
  reps: '',
  load: '',
  minutes: '',
  seconds: '',
  distance: '',
  segments: '',
  segmentLength: '',
  value: '',
};

export function emptyDraft(exerciseId: string, date: Day): Draft {
  return { ...BLANK_FIELDS, exerciseId, date, words: '', note: '', loadAsFilled: null };
}

/** The fields a kind of exercise is entered with, in the order of the form. */
export function fieldsOf(exercise: Exercise): readonly NumberField[] {
  switch (exercise.kind) {
    case 'bodyweight':
      return ['reps', 'load', 'minutes', 'seconds'];
    case 'weight':
      return ['load', 'reps'];
    case 'distanceTime':
      return ['distance', 'minutes', 'seconds'];
    case 'shuttle':
      return ['segments', 'segmentLength', 'minutes', 'seconds'];
    case 'duration':
      return ['minutes', 'seconds'];
    case 'count':
      return ['value'];
    case 'text':
      return [];
  }
}

/** Fills the form with an entry that is about to be edited, weights in the chosen unit. */
export function draftFrom(entry: WorkoutEntry, exercise: Exercise, language: Language, units: Units): Draft {
  const text = (value: number | null) => (value === null ? '' : formatNumber(value, language));
  const time = entry.durationMs === null ? null : splitDuration(entry.durationMs);
  const inKm = exercise.kind === 'distanceTime' && exercise.distanceUnit !== 'm';
  const load = entry.loadKg === null ? '' : weightField(entry.loadKg, units.weight, language);

  return {
    exerciseId: entry.exerciseId,
    date: entry.date,
    reps: text(entry.reps),
    load,
    minutes: time && time.minutes > 0 ? text(time.minutes) : '',
    seconds: time ? text(time.seconds) : '',
    distance: exercise.kind === 'shuttle' ? '' : text(entry.distanceM === null ? null : inKm ? entry.distanceM / 1000 : entry.distanceM),
    segments: text(entry.segments),
    segmentLength: exercise.kind === 'shuttle' ? text(entry.distanceM) : '',
    value: text(entry.value),
    words: exercise.kind === 'text' ? (entry.text ?? '') : '',
    note: entry.note,
    loadAsFilled: entry.loadKg === null ? null : { text: load, kg: entry.loadKg },
  };
}

/**
 * Turns what was typed into the numbers of a result and says what is wrong with it, if
 * anything. Only the fields that belong to the kind of exercise are read.
 */
export function readDraft(draft: Draft, exercise: Exercise, units: Units): { measures: Measures; problems: DraftProblem[] } {
  const shown = fieldsOf(exercise);
  const values: Partial<Record<NumberField, number>> = {};
  const unreadable: DraftProblem[] = [];

  for (const field of shown) {
    const typed = draft[field].trim();
    if (typed === '') continue;

    const value = parseDecimal(typed);
    if (value === null) unreadable.push({ notANumber: field });
    else values[field] = value;
  }

  const has = (field: NumberField) => shown.includes(field);
  const distance =
    exercise.kind === 'shuttle'
      ? values.segmentLength
      : values.distance === undefined
        ? undefined
        : exercise.distanceUnit === 'm'
          ? values.distance
          : values.distance * 1000;

  const untouchedLoad = draft.loadAsFilled !== null && draft.load.trim() === draft.loadAsFilled.text;
  const loadKg = values.load === undefined ? null : untouchedLoad && draft.loadAsFilled ? draft.loadAsFilled.kg : weightFrom(values.load, units.weight);

  const measures: Measures = {
    ...NO_MEASURES,
    reps: values.reps ?? null,
    loadKg,
    durationMs: has('minutes') ? joinDuration(values.minutes ?? null, values.seconds ?? null) : null,
    distanceM: distance === undefined ? null : roundMetres(distance),
    segments: values.segments ?? null,
    value: values.value ?? null,
    text: exercise.kind === 'text' && draft.words.trim() !== '' ? draft.words.trim() : null,
  };

  return { measures, problems: unreadable.length > 0 ? unreadable : entryProblems(measures, exercise) };
}
