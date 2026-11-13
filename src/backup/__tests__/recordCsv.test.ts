import { makeRecordHistory } from '@/domain/__tests__/recordDataset';

import { readRecordCsv, writeRecordCsv } from '../recordCsv';

const rows = (text: string) => {
  const reading = readRecordCsv(text);
  if (!reading.ok) throw new Error('not read as a Record file');
  return reading.workouts.map(({ date, exercise, count }) => [date, exercise, count]);
};

describe("Record's export file", () => {
  it('is read back row for row, in every format Record wrote', () => {
    const history = makeRecordHistory(2026, 400);

    const reading = readRecordCsv(writeRecordCsv(history));

    expect(reading).toMatchObject({ ok: true, unreadable: [] });
    expect(rows(writeRecordCsv(history))).toEqual(history.map(({ date, exercise, count }) => [date, exercise, count]));
  });

  it('is written by the test helper exactly as Record writes it', () => {
    // Record: "Дата,Вправа,Результат\n" then `"${w.date}","${w.exercise}","${w.count}"\n`, after a byte order mark.
    expect(writeRecordCsv([{ date: '2026-03-01', exercise: 'Підтягування', count: '12 (+20 кг)' }])).toBe(
      '﻿Дата,Вправа,Результат\n"2026-03-01","Підтягування","12 (+20 кг)"\n',
    );
  });

  it('keeps commas, brackets and colons inside a result', () => {
    const text = writeRecordCsv([
      { date: '2026-03-01', exercise: 'Біг 5 км', count: '24:30 (5 км)' },
      { date: '2026-03-02', exercise: 'Колове, 3 кола', count: '12, 10, 8' },
      { date: '2026-03-03', exercise: 'Човниковий біг 4×9м', count: '0:09.80 (4×9м)' },
    ]);

    expect(rows(text)).toEqual([
      ['2026-03-01', 'Біг 5 км', '24:30 (5 км)'],
      ['2026-03-02', 'Колове, 3 кола', '12, 10, 8'],
      ['2026-03-03', 'Човниковий біг 4×9м', '0:09.80 (4×9м)'],
    ]);
  });

  it('copes with the quotes Record does not escape', () => {
    const text = writeRecordCsv([
      { date: '2026-03-01', exercise: 'Стрибок "жабка"', count: '5 (2")' },
      { date: '2026-03-02', exercise: '"Мурф"', count: '"найкращий" час 41:10' },
    ]);

    expect(rows(text)).toEqual([
      ['2026-03-01', 'Стрибок "жабка"', '5 (2")'],
      ['2026-03-02', '"Мурф"', '"найкращий" час 41:10'],
    ]);
  });

  it('gives every row an id of its own that is the same on every reading', () => {
    const text = writeRecordCsv([
      { date: '2026-03-01', exercise: 'Підтягування', count: '12' },
      { date: '2026-03-01', exercise: 'Підтягування', count: '12' },
      { date: '2026-03-01', exercise: 'Підтягування', count: '11' },
    ]);
    const ids = (source: string) => {
      const reading = readRecordCsv(source);
      return reading.ok ? reading.workouts.map((workout) => workout.id) : [];
    };

    expect(ids(text)).toEqual([
      'csv:2026-03-01|Підтягування|12#1',
      'csv:2026-03-01|Підтягування|12#2',
      'csv:2026-03-01|Підтягування|11#1',
    ]);
    expect(ids(text)).toEqual(ids(text));
  });

  it('keeps the ids of old rows when new rows are added in front, as Record lists the newest first', () => {
    const old = [{ date: '2026-03-01', exercise: 'Підтягування', count: '12' }];
    const later = [{ date: '2026-03-05', exercise: 'Підтягування', count: '13' }, ...old];
    const idOfOld = (source: string) => {
      const reading = readRecordCsv(source);
      return reading.ok ? reading.workouts.find((workout) => workout.date === '2026-03-01')?.id : undefined;
    };

    expect(idOfOld(writeRecordCsv(later))).toBe(idOfOld(writeRecordCsv(old)));
  });

  it('reads Windows line ends and skips empty lines', () => {
    const text = '﻿Дата,Вправа,Результат\r\n\r\n"2026-03-01","Бруси","20"\r\n\r\n"2026-03-02","Бруси","21"\r\n';

    expect(rows(text)).toEqual([
      ['2026-03-01', 'Бруси', '20'],
      ['2026-03-02', 'Бруси', '21'],
    ]);
  });

  it('reads a file that went through a spreadsheet: no quotes, or semicolons', () => {
    expect(rows('Дата,Вправа,Результат\n2026-03-01,Бруси,20\n')).toEqual([['2026-03-01', 'Бруси', '20']]);
    expect(rows('Дата;Вправа;Результат\n2026-03-01;Колове, 3 кола;12 (+20 кг)\n')).toEqual([
      ['2026-03-01', 'Колове, 3 кола', '12 (+20 кг)'],
    ]);
    expect(rows('"Дата";"Вправа";"Результат"\n"2026-03-01";"Стрибок ""жабка""";"5"\n')).toEqual([
      ['2026-03-01', 'Стрибок "жабка"', '5'],
    ]);
  });

  it('reads a file with a header and nothing else as empty', () => {
    expect(readRecordCsv('﻿Дата,Вправа,Результат\n')).toEqual({ ok: true, workouts: [], unreadable: [] });
  });

  it('lists the lines that are not three values, and reads the rest', () => {
    const text = 'Дата,Вправа,Результат\n"2026-03-01","Бруси","20"\nщось інше\n"2026-03-02","Бруси"\n"2026-03-03","Бруси","21"\n';
    const reading = readRecordCsv(text);

    expect(reading).toMatchObject({
      ok: true,
      unreadable: [
        { line: 3, text: 'щось інше' },
        { line: 4, text: '"2026-03-02","Бруси"' },
      ],
    });
    expect(rows(text)).toHaveLength(2);
  });

  it.each([
    ['an empty file', ''],
    ['a backup', '{"format":"record-backup","version":1}'],
    ['another table', 'Name,Age\nAnna,30\n'],
    ['rows without the header', '"2026-03-01","Бруси","20"\n'],
    ['a header with a column more', 'Дата,Вправа,Результат,Нотатка\n'],
  ])('refuses %s', (_, text) => {
    expect(readRecordCsv(text)).toEqual({ ok: false, problem: 'notRecordCsv' });
  });
});
