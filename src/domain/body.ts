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
