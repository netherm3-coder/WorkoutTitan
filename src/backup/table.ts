/*
 * A table of entries for a spreadsheet, as Record's "Export records" gave one: a CSV file that
 * Google Sheets or Excel opens. It is for reading elsewhere; the app does not read it back, the
 * backup file is for that.
 */

/** One cell: text, or nothing. Numbers come already written the way the person reads them. */
export type Cell = string | null;

/** Starts a spreadsheet would take for a formula. */
const FORMULA_START = /^[=+\-@\t\r]/;

/**
 * Writes rows as CSV. Every cell is quoted, as Record did, so a decimal comma or a comma in a
 * note stays in its cell. A line break inside a note becomes a space, as in Record, since some
 * spreadsheets split rows on it anyway. A cell that a spreadsheet would read as a formula, a
 * note starting with "-5 kg" say, gets an apostrophe in front, so that it stays text: the
 * usual guard against formulas in a CSV. The byte order mark lets Excel see UTF-8, so Cyrillic shows as it is; lines end in
 * CRLF, as RFC 4180 has them.
 */
export function toCsv(rows: readonly (readonly Cell[])[]): string {
  const cell = (value: Cell) => {
    const flat = (value ?? '').replace(/\r\n|\r|\n/g, ' ');
    const text = FORMULA_START.test(flat) ? `'${flat}` : flat;
    return `"${text.replace(/"/g, '""')}"`;
  };
  return `﻿${rows.map((row) => row.map(cell).join(',')).join('\r\n')}\r\n`;
}

/**
 * A bare time with the hours written out, as spreadsheets read a duration: 24:30 becomes
 * 0:24:30. As it is, a spreadsheet takes 24:30 for twenty-four and a half hours and a 3:00 plank
 * for three hours. Anything but a bare minutes-and-seconds time stays as it is.
 */
export function withHours(text: string): string {
  const clock = /^(\d+):(\d{2}(?:[.,]\d+)?)$/.exec(text);
  return clock ? `0:${(clock[1] ?? '').padStart(2, '0')}:${clock[2] ?? ''}` : text;
}

/** The name of the table file made on `day`, a YYYY-MM-DD date. Latin, so that every app keeps it. */
export function entriesTableName(day: string): string {
  return `record-entries-${day}.csv`;
}
