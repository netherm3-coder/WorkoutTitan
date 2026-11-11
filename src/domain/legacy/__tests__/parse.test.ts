import {
  isBareClock,
  isUsedUp,
  normalise,
  numberWithUnit,
  takeBracketedClock,
  takeKilometres,
  takeLoadKg,
  takeLoadWithUnitKg,
  takeMetres,
  takeNumber,
  takeRaceTime,
  takeShuttleScheme,
  trailingDistance,
} from '../parse';

describe('normalise', () => {
  it('turns decimal commas into dots and trims', () => {
    expect(normalise(' 12,5 (+7,5 кг) ')).toBe('12.5 (+7.5 кг)');
  });
});

describe('isUsedUp', () => {
  it('is true when only brackets and spaces are left', () => {
    expect(isUsedUp('  ( )  ')).toBe(true);
    expect(isUsedUp('')).toBe(true);
    expect(isUsedUp(' ( у дощ ) ')).toBe(false);
  });
});

describe('takeNumber', () => {
  it('takes the number a result starts with', () => {
    expect(takeNumber('12 (+20 кг)')).toEqual({ value: 12, rest: '  (+20 кг)' });
    expect(takeNumber('12.5')?.value).toBe(12.5);
    expect(takeNumber('  7')?.value).toBe(7);
  });

  it('leaves what follows the number for others to judge', () => {
    expect(takeNumber('12+10+8')?.rest.trim()).toBe('+10+8');
    expect(takeNumber('12.5.3')).toMatchObject({ value: 12.5 });
  });

  it.each(['багато', '-5', '.5', '', '(12)'])('finds no number at the start of "%s"', (text) => {
    expect(takeNumber(text)).toBeNull();
  });
});

describe('takeLoadKg', () => {
  it.each([
    ['12 (+20 кг)', 20],
    ['12 (20кг)', 20],
    ['12 ( + 7.5 кг )', 7.5],
    ['12 (+20 КГ)', 20],
    ['12 (+0 кг)', 0],
    ['12 (20)', 20],
  ])('reads the load in "%s"', (text, expected) => {
    expect(takeLoadKg(text)?.value).toBe(expected);
  });

  it('does not mistake a time for a load', () => {
    expect(takeLoadKg('12 (0:41)')).toBeNull();
  });

  it('removes only the load', () => {
    expect(takeLoadKg('12 (+20 кг) (0:41)')?.rest).toBe('12   (0:41)');
  });
});

describe('takeLoadWithUnitKg', () => {
  it('reads a weight only when its unit is written', () => {
    expect(takeLoadWithUnitKg('1 (+100 кг)')?.value).toBe(100);
    expect(takeLoadWithUnitKg('5 (82.5кг)')?.value).toBe(82.5);
    expect(takeLoadWithUnitKg('100 кг (5)')).toBeNull();
  });
});

describe('takeBracketedClock', () => {
  it('reads a time in brackets', () => {
    expect(takeBracketedClock('12 (0:41)')?.value).toBe(41_000);
    expect(takeBracketedClock('50 (1:30.5)')?.value).toBe(90_500);
    expect(takeBracketedClock('12 (+20 кг) (2:05)')?.value).toBe(125_000);
  });

  it('wants the brackets and the colon', () => {
    expect(takeBracketedClock('0:41')).toBeNull();
    expect(takeBracketedClock('12 (+20 кг)')).toBeNull();
  });
});

describe('isBareClock', () => {
  it.each(['12:30', '2:15:50', '0:05'])('accepts %s', (text) => {
    expect(isBareClock(text)).toBe(true);
  });

  it.each(['0:24.50', '123:00', '12:3', '12:30 (5 км)', '12'])('rejects %s', (text) => {
    expect(isBareClock(text)).toBe(false);
  });
});

describe('takeRaceTime', () => {
  it.each([
    ['0:24.50 (4×9м)', 24_500],
    ['0:09.8 (4×9м)', 9_800],
    ['24.5 с (10х10 м)', 24_500],
    ['10х10 м (24.5 с)', 24_500],
    ['24:30 (5 км)', 1_470_000],
    ['5 км (25:00)', 1_500_000],
    ['1:45:30 (21.1 км)', 6_330_000],
    ['12.5 с (100 м)', 12_500],
    ['100 м (12.5 с)', 12_500],
    ['3:45.5 (1 км)', 225_500],
    ['1 км (3:45.5)', 225_500],
    ['24.5 с', 24_500],
  ])('reads the time in "%s"', (text, expected) => {
    expect(takeRaceTime(text)?.value).toBe(expected);
  });

  it('leaves the distance behind', () => {
    expect(takeRaceTime('24:30 (5 км)')?.rest.trim()).toBe('(5 км)');
    expect(takeRaceTime('10х10 м (24.5 с)')?.rest.trim()).toBe('10х10 м ( )');
  });

  it('finds no time in words', () => {
    expect(takeRaceTime('не добіг')).toBeNull();
  });
});

describe('takeKilometres', () => {
  it('hands kilometres back in metres', () => {
    expect(takeKilometres('Біг 5 км')?.value).toBe(5000);
    expect(takeKilometres('2.5км')?.value).toBe(2500);
    expect(takeKilometres('5 км (25:00)')?.rest.trim()).toBe('(25:00)');
  });

  it('does not read metres', () => {
    expect(takeKilometres('Спринт 100 м')).toBeNull();
  });
});

describe('takeMetres', () => {
  it('reads metres', () => {
    expect(takeMetres('Спринт 100 м')?.value).toBe(100);
    expect(takeMetres('  (60м)')?.value).toBe(60);
  });

  it('does not read kilometres', () => {
    expect(takeMetres('Біг 5 км')).toBeNull();
  });
});

describe('takeShuttleScheme', () => {
  it.each([
    ['4×9м', 4, 9],
    ['10х10 м', 10, 10],
    ['10Х10', 10, 10],
    ['6x100', 6, 100],
    ['6X100м', 6, 100],
    ['10*10', 10, 10],
    ['3×7.5м', 3, 7.5],
    ['Човниковий біг 4 × 9 м', 4, 9],
  ])('reads "%s"', (text, segments, segmentM) => {
    expect(takeShuttleScheme(text)?.value).toEqual({ segments, segmentM });
  });

  it('takes the unit along with the scheme', () => {
    expect(isUsedUp(takeShuttleScheme('(4×9м)')?.rest ?? 'x')).toBe(true);
    expect(isUsedUp(takeShuttleScheme('10х10 м ( )')?.rest ?? 'x')).toBe(true);
  });

  it('finds no scheme without two numbers', () => {
    expect(takeShuttleScheme('ялинка')).toBeNull();
    expect(takeShuttleScheme('0×10')).toBeNull();
  });
});

describe('trailingDistance', () => {
  it('splits a distance off the end of an exercise name', () => {
    expect(trailingDistance('Марш-кидок 30 км')).toEqual({ baseName: 'Марш-кидок', distanceM: 30_000, unit: 'km' });
    expect(trailingDistance('Плавання 400 м')).toEqual({ baseName: 'Плавання', distanceM: 400, unit: 'm' });
    expect(trailingDistance('Крос по лісу 2.5км')).toEqual({ baseName: 'Крос по лісу', distanceM: 2500, unit: 'km' });
    expect(trailingDistance('Крос, ліс 2,5 км')).toEqual({ baseName: 'Крос, ліс', distanceM: 2500, unit: 'km' });
  });

  it.each(['Планка', '30 км', 'Крос 0 км', 'Заплив 2 милі'])('finds none in "%s"', (name) => {
    expect(trailingDistance(name)).toBeNull();
  });
});

describe('numberWithUnit', () => {
  it('reads a number with or without a unit', () => {
    expect(numberWithUnit('100 кг')).toEqual({ value: 100, unit: 'кг' });
    expect(numberWithUnit('100кг')).toEqual({ value: 100, unit: 'кг' });
    expect(numberWithUnit('12.5 разів')).toEqual({ value: 12.5, unit: 'разів' });
    expect(numberWithUnit('50')).toEqual({ value: 50, unit: null });
  });

  it.each(['5 км (25:00)', '12:30', 'легко', '12 (+20 кг)', '1.5.2', ''])('does not read "%s"', (text) => {
    expect(numberWithUnit(text)).toBeNull();
  });
});
