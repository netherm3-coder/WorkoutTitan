import type { Day } from './dates';

/** The body parts Record measured, in the order of its form. A person can add their own. */
export const BODY_PARTS = ['neck', 'shoulders', 'chest', 'waist', 'bicep', 'forearm', 'thigh', 'calf'] as const;

export type BodyPart = (typeof BODY_PARTS)[number];

export const isBuiltInPart = (part: string): part is BodyPart => (BODY_PARTS as readonly string[]).includes(part);

/**
 * A body part the person added. It is measured like the built-in ones: around, in centimetres.
 * Measurements keep its id, so renaming it changes nothing else.
 */
export type OwnBodyPart = { id: string; name: string };

/** One measurement with a tape: a body part on a day, in centimetres. */
export type BodyMeasurement = {
  date: Day;
  /** One of `BODY_PARTS`, or the id of a part of the person's own. */
  part: string;
  cm: number;
};

/** A built-in part on the body map: its latest measurement and how it changed since the one before. */
export type MapSpot = {
  part: BodyPart;
  cm: number;
  date: Day;
  /** Centimetres since the part was measured before; `null` for a part measured once. */
  change: number | null;
};

/**
 * What the body map of Record shows: the latest measurement of each built-in part, with the
 * change since that same part was measured before. Parts never measured are left out, and so
 * are a person's own parts, which have no place on the drawing.
 */
export function bodyMapOf(measurements: readonly BodyMeasurement[]): MapSpot[] {
  const byPart = new Map<BodyPart, BodyMeasurement[]>();
  for (const measurement of [...measurements].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))) {
    if (!isBuiltInPart(measurement.part)) continue;
    const list = byPart.get(measurement.part) ?? [];
    list.push(measurement);
    byPart.set(measurement.part, list);
  }

  return BODY_PARTS.flatMap((part) => {
    const list = byPart.get(part) ?? [];
    const latest = list[list.length - 1];
    if (!latest) return [];
    const before = list[list.length - 2];
    return [{ part, cm: latest.cm, date: latest.date, change: before ? latest.cm - before.cm : null }];
  });
}
