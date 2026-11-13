import type { LegacyWorkout } from '@/domain';

/*
 * Reads the file Record's "Експорт рекордів" button writes. Record builds it like this:
 *
 *     "Дата,Вправа,Результат\n" + rows of `"${date}","${exercise}","${count}"\n`
 *
 * with a byte order mark in front. Three things follow from that:
 *
 * - The file has the date, the name of the exercise and the result as text. It has no notes,
 *   no links, no time of day and no body weight: those cannot be brought over from it.
 * - Record does not escape quotes, so a result like `5 (2")` comes out as `"5 (2")"`. The
 *   reader takes a quote as the end of a value only when a separator or the end of the line
 *   follows it.
 * - Rows have no ids. Each gets one made from its own text (see `rowId`), so bringing the same
 *   file in twice adds nothing the second time.
 *
 * A file that went through a spreadsheet on the way (no quotes, or `;` between the values) is
 * read as well.
 */

const HEADER = ['дата', 'вправа', 'результат'];

export type RecordCsv = {
  workouts: (LegacyWorkout & { id: string })[];
  /** Lines that are not three values, by their number in the file, with their text. */
  unreadable: { line: number; text: string }[];
};

export type RecordCsvReading = ({ ok: true } & RecordCsv) | { ok: false; problem: 'notRecordCsv' };

/** Splits one line into values. `"` ends a quoted value only before a separator or the end. */
function splitLine(line: string, separator: string): string[] {
  const values: string[] = [];
  let position = 0;

  while (position <= line.length) {
    let value = '';
    if (line[position] === '"') {
      position += 1;
      for (;;) {
        const char = line[position];
        if (char === undefined) break;
        if (char === '"') {
          const next = line[position + 1];
          const closes = (at: number) => line[at] === undefined || line[at] === separator;
          if (closes(position + 1)) {
            position += 1;
            break;
          }
          if (next === '"' && closes(position + 2)) {
            // Record's own writing of a value that ends with a quote: `"5 (2")"`.
            value += '"';
            position += 2;
            break;
          }
          // A doubled quote is one quote, the way a spreadsheet writes it.
          if (next === '"') position += 1;
        }
        value += char;
        position += 1;
      }
    } else {
      const end = line.indexOf(separator, position);
      value = line.slice(position, end === -1 ? line.length : end);
      position = end === -1 ? line.length : end;
    }
    values.push(value.trim());

    if (line[position] !== separator) break;
    position += 1;
  }

  return values;
}

/** The separator the header was written with, or `null` if this is not Record's header. */
function separatorOf(header: string): string | null {
  for (const separator of [',', ';', '\t']) {
    const names = splitLine(header, separator).map((name) => name.toLowerCase());
    if (names.length === HEADER.length && names.every((name, index) => name === HEADER[index])) return separator;
  }
  return null;
}

/**
 * An id for a row that has none: its own text, and which one it is among rows that say exactly
 * the same (two equal sets on one day are two entries).
 */
function rowId(date: string, exercise: string, count: string, occurrence: number): string {
  return `csv:${date}|${exercise}|${count}#${occurrence}`;
}

export function readRecordCsv(text: string): RecordCsvReading {
  const lines = text.replace(/^﻿/, '').split(/\r\n|\n|\r/);
  const headerAt = lines.findIndex((line) => line.trim() !== '');
  const separator = headerAt === -1 ? null : separatorOf(lines[headerAt]?.trim() ?? '');
  if (separator === null) return { ok: false, problem: 'notRecordCsv' };

  const workouts: RecordCsv['workouts'] = [];
  const unreadable: RecordCsv['unreadable'] = [];
  const seen = new Map<string, number>();

  lines.forEach((line, index) => {
    if (index <= headerAt || line.trim() === '') return;

    const values = splitLine(line.trim(), separator);
    const [date = '', exercise = '', count = ''] = values;
    if (values.length !== 3) {
      unreadable.push({ line: index + 1, text: line });
      return;
    }

    const key = `${date}|${exercise}|${count}`;
    const occurrence = (seen.get(key) ?? 0) + 1;
    seen.set(key, occurrence);
    workouts.push({ id: rowId(date, exercise, count, occurrence), date, exercise, count });
  });

  return { ok: true, workouts, unreadable };
}

/** Writes the file the way Record does. For tests and for nothing else. */
export function writeRecordCsv(workouts: readonly Pick<LegacyWorkout, 'date' | 'exercise' | 'count'>[]): string {
  return `﻿Дата,Вправа,Результат\n${workouts.map((w) => `"${w.date}","${w.exercise}","${w.count}"\n`).join('')}`;
}
