import { entriesTableName, toCsv, withHours } from '../table';

describe('toCsv', () => {
  it('quotes every cell and ends lines as RFC 4180 does, after a byte order mark for Excel', () => {
    expect(toCsv([['Дата', 'Результат'], ['2026-11-21', '12 (+20 кг)']])).toBe('﻿"Дата","Результат"\r\n"2026-11-21","12 (+20 кг)"\r\n');
  });

  it('keeps commas, decimal commas and quotes inside their cells', () => {
    expect(toCsv([['82,5', 'важко, але "чисто"']])).toBe('﻿"82,5","важко, але ""чисто"""\r\n');
  });

  it('leaves an empty cell for nothing', () => {
    expect(toCsv([['a', null, 'b']])).toBe('﻿"a","","b"\r\n');
  });

  it('puts a note on one line, as Record did', () => {
    expect(toCsv([['перший рядок\nдругий\r\nтретій']])).toBe('﻿"перший рядок другий третій"\r\n');
  });

  it('keeps a spreadsheet from taking a cell for a formula', () => {
    expect(toCsv([['-5 кг сьогодні', '=1+1', '+20', '@all', '5-й підхід']])).toBe(
      `﻿"'-5 кг сьогодні","'=1+1","'+20","'@all","5-й підхід"\r\n`,
    );
  });
});

describe('withHours', () => {
  it('writes the hours of a bare time, so that a spreadsheet reads minutes as minutes', () => {
    expect(['24:30', '3:00', '0:09.8', '0:13,95'].map(withHours)).toEqual(['0:24:30', '0:03:00', '0:00:09.8', '0:00:13,95']);
  });

  it('leaves times with hours and every other result as they are', () => {
    expect(['1:45:30', '12 (0:41)', '60 кг × 8', '16', '380 разів'].map(withHours)).toEqual([
      '1:45:30',
      '12 (0:41)',
      '60 кг × 8',
      '16',
      '380 разів',
    ]);
  });
});

describe('entriesTableName', () => {
  it('names the file by its day, in Latin letters', () => {
    expect(entriesTableName('2026-11-21')).toBe('record-entries-2026-11-21.csv');
  });
});
