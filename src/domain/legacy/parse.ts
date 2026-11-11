/**
 * Readers for the result strings of the Record web app, where one text field held everything:
 * "12 (+20 кг) (0:41)", "24:30 (5 км)", "0:24.50 (4×9м)". Each reader looks for its piece the
 * way Record did, so old entries are understood the same way.
 *
 * A reader hands back what it found together with the rest of the string. When every piece has
 * been taken and something is still left, the entry says more than the numbers can hold.
 */

import { MS_PER_HOUR, MS_PER_MINUTE, secondsToMs } from '../duration';

/** A piece read out of a string, and the string without it. */
export type Taken<T> = { value: T; rest: string };

function take<T>(text: string, pattern: RegExp, read: (match: RegExpExecArray) => T | null): Taken<T> | null {
  const match = pattern.exec(text);
  if (!match) return null;

  const value = read(match);
  if (value === null) return null;

  return { value, rest: `${text.slice(0, match.index)} ${text.slice(match.index + match[0].length)}` };
}

function toNumber(text: string | undefined): number | null {
  if (text === undefined) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

/** Record accepted both decimal separators and turned commas into dots before reading. */
export function normalise(text: string): string {
  return text.replace(/,/g, '.').trim();
}

/** True when nothing but brackets and spaces is left of a string after reading it. */
export function isUsedUp(rest: string): boolean {
  return rest.replace(/[()\s]/g, '') === '';
}

/** The number a string starts with: "12 (+20 кг)" starts with 12. */
export function takeNumber(text: string): Taken<number> | null {
  return take(text, /^\s*(\d+(?:\.\d+)?)/, (match) => toNumber(match[1]));
}

/**
 * Extra load written in brackets: "(+20 кг)", "(20кг)", and, as Record read it, a bare "(20)".
 * A time in brackets such as "(0:41)" is not a load.
 */
export function takeLoadKg(text: string): Taken<number> | null {
  return take(text, /\(\s*\+?\s*([\d.]+)\s*к?г?\s*\)/i, (match) => toNumber(match[1]));
}

/**
 * The weight of a lift written in brackets, unit and all: "(+100 кг)". This is the only way
 * Record itself read a bench press, so a bare "(5)" is not taken for a weight here.
 */
export function takeLoadWithUnitKg(text: string): Taken<number> | null {
  return take(text, /\(\s*\+?\s*([\d.]+)\s*кг\s*\)/i, (match) => toNumber(match[1]));
}

/** A time written in brackets after the result: "(0:41)", "(1:30.5)". In milliseconds. */
export function takeBracketedClock(text: string): Taken<number> | null {
  return take(text, /\(\s*(\d+):(\d+(?:\.\d+)?)\s*\)/, (match) => {
    const seconds = toNumber(match[2]);
    return seconds === null ? null : Number(match[1]) * MS_PER_MINUTE + secondsToMs(seconds);
  });
}

/** Whether the whole string is a bare time: "12:30", "2:15:50". */
export function isBareClock(text: string): boolean {
  return /^\d{1,2}:\d{2}(:\d{2})?$/.test(text);
}

/**
 * The time of a run, sprint or shuttle run, in any format Record ever wrote:
 * "0:24.50 (4×9м)", "24.5 с (10х10 м)", "24:30 (5 км)", "5 км (25:00)", "100 м (12.5 с)".
 * In milliseconds; `null` when the string holds no time.
 */
export function takeRaceTime(text: string): Taken<number> | null {
  const seconds = (match: RegExpExecArray) => {
    const value = toNumber(match[1]);
    return value === null ? null : secondsToMs(value);
  };

  return (
    // Seconds first: "24.5 с (10х10 м)", "12.5 с (100 м)".
    take(text, /^\s*([\d.]+)\s*с(?=\s*\()/, seconds) ??
    // A clock anywhere: "24:30 (5 км)", "5 км (25:00)", "1:02:03", "0:24.50 (4×9м)".
    take(text, /(\d+):(\d+)(?::(\d+))?(?:\.(\d+))?/, (match) => {
      const whole =
        match[3] === undefined
          ? Number(match[1]) * MS_PER_MINUTE + secondsToMs(Number(match[2]))
          : Number(match[1]) * MS_PER_HOUR + Number(match[2]) * MS_PER_MINUTE + secondsToMs(Number(match[3]));
      return whole + (match[4] === undefined ? 0 : secondsToMs(Number(`0.${match[4]}`)));
    }) ??
    // Seconds anywhere: "100 м (12.5 с)".
    take(text, /([\d.]+)\s*с/, seconds)
  );
}

/** A distance in kilometres ("Біг 5 км", "5 км (25:00)"), handed back in metres. */
export function takeKilometres(text: string): Taken<number> | null {
  return take(text, /([\d.]+)\s*км/i, (match) => {
    const km = toNumber(match[1]);
    return km === null ? null : km * 1000;
  });
}

/** A distance in metres ("Спринт 100 м", "12.5 с (100 м)"). Kilometres do not count. */
export function takeMetres(text: string): Taken<number> | null {
  return take(text, /([\d.]+)\s*м(?=$|[\s)])/i, (match) => toNumber(match[1]));
}

export type ShuttleScheme = { segments: number; segmentM: number };

/** A shuttle scheme such as "4×9м", "10х10 м" or "6x100": the segments and the length of one. */
export function takeShuttleScheme(text: string): Taken<ShuttleScheme> | null {
  return take(text, /(\d+)\s*[×xхXХ*]\s*(\d+(?:\.\d+)?)(?:\s*м(?=$|[\s)]))?/, (match) => {
    const segments = Number(match[1]);
    const segmentM = Number(match[2]);
    return segments > 0 && segmentM > 0 ? { segments, segmentM } : null;
  });
}

/**
 * Splits a custom exercise name that ends in a distance, the way Record built it for
 * "distance and time" results: "Марш-кидок 30 км" is the exercise "Марш-кидок" over 30 000 m.
 */
export function trailingDistance(name: string): { baseName: string; distanceM: number; unit: 'km' | 'm' } | null {
  const match = /^(.*\S)\s+([\d.,]+)\s*(км|м)$/i.exec(name.trim());
  if (!match) return null;

  const amount = toNumber(match[2]?.replace(',', '.'));
  if (amount === null || !(amount > 0)) return null;

  const unit = (match[3] ?? '').toLowerCase() === 'км' ? 'km' : 'm';
  return { baseName: (match[1] ?? '').trim(), distanceM: unit === 'km' ? amount * 1000 : amount, unit };
}

/** A plain number with an optional unit and nothing else: "100 кг", "50", "12.5 разів". */
export function numberWithUnit(text: string): { value: number; unit: string | null } | null {
  const match = /^(\d+(?:\.\d+)?)\s*([^\d().:\s][^()]*)?$/.exec(text);
  if (!match) return null;

  const value = toNumber(match[1]);
  if (value === null) return null;

  const unit = match[2]?.trim();
  return { value, unit: unit ? unit : null };
}
