import type { Day } from './dates';

/** The body parts Record measured, in the order of its form. A person can add their own. */
export const BODY_PARTS = ['neck', 'shoulders', 'chest', 'waist', 'bicep', 'forearm', 'thigh', 'calf'] as const;

export type BodyPart = (typeof BODY_PARTS)[number];

/** One measurement with a tape: a body part on a day, in centimetres. */
export type BodyMeasurement = {
  date: Day;
  /** One of `BODY_PARTS`, or a name the person made up. */
  part: string;
  cm: number;
};
