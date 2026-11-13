import {
  BENCH_PRESS,
  BODYWEIGHT_CLASSICS,
  BUILT_IN_EXERCISES,
  changeExercise,
  choosesDirection,
  customExercise,
  DIPS,
  disciplineKey,
  EXERCISE_KINDS,
  exerciseLookup,
  isRace,
  PULLUPS,
  PUSHUPS,
  roundMetres,
  RUN,
  SHUTTLE,
  SPRINT,
} from '../exercises';

const none = { distanceM: null, segments: null };

describe('built-in exercises', () => {
  it('have ids of their own', () => {
    const ids = BUILT_IN_EXERCISES.map((exercise) => exercise.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(['benchPress', 'dips', 'pullups', 'pushups', 'run', 'shuttle', 'sprint']);
  });

  it('are named by translations, not by a stored name', () => {
    for (const exercise of BUILT_IN_EXERCISES) {
      expect(exercise).toMatchObject({ builtIn: true, name: null, unit: null });
    }
  });

  it('know which way is better', () => {
    expect([PULLUPS, PUSHUPS, DIPS, BENCH_PRESS].map((exercise) => exercise.better)).toEqual(Array(4).fill('higher'));
    expect([RUN, SPRINT, SHUTTLE].map((exercise) => exercise.better)).toEqual(Array(3).fill('lower'));
  });

  it('measure runs in kilometres and sprints in metres', () => {
    expect(RUN.distanceUnit).toBe('km');
    expect(SPRINT.distanceUnit).toBe('m');
  });

  it('count pull-ups, push-ups and dips as the classics', () => {
    expect(BODYWEIGHT_CLASSICS).toEqual([PULLUPS, PUSHUPS, DIPS]);
  });
});

describe('customExercise', () => {
  it('takes the usual direction of its kind', () => {
    const better = (kind: Parameters<typeof customExercise>[0]['kind']) =>
      customExercise({ id: 'x', name: 'X', kind }).better;

    expect(better('bodyweight')).toBe('higher');
    expect(better('weight')).toBe('higher');
    expect(better('count')).toBe('higher');
    expect(better('distanceTime')).toBe('lower');
    expect(better('shuttle')).toBe('lower');
    expect(better('duration')).toBe('lower');
  });

  it('lets a hold be better the longer it lasts', () => {
    expect(customExercise({ id: 'plank', name: 'Планка', kind: 'duration', better: 'higher' }).better).toBe('higher');
  });

  it('never compares results in words', () => {
    expect(customExercise({ id: 'x', name: 'X', kind: 'text', better: 'higher' }).better).toBeNull();
  });

  it('keeps a unit only for counts and a distance unit only for distances', () => {
    expect(customExercise({ id: 'x', name: 'X', kind: 'count', unit: ' кг ' }).unit).toBe('кг');
    expect(customExercise({ id: 'x', name: 'X', kind: 'count', unit: '  ' }).unit).toBeNull();
    expect(customExercise({ id: 'x', name: 'X', kind: 'duration', unit: 'кг' }).unit).toBeNull();

    expect(customExercise({ id: 'x', name: 'X', kind: 'distanceTime' }).distanceUnit).toBe('km');
    expect(customExercise({ id: 'x', name: 'X', kind: 'distanceTime', distanceUnit: 'm' }).distanceUnit).toBe('m');
    expect(customExercise({ id: 'x', name: 'X', kind: 'count', distanceUnit: 'm' }).distanceUnit).toBeNull();
  });

  it('trims the name and is not built in', () => {
    expect(customExercise({ id: 'x', name: '  Планка ', kind: 'duration' })).toMatchObject({
      name: 'Планка',
      builtIn: false,
    });
  });
});

describe('exerciseLookup', () => {
  it('finds built-in and custom exercises and nothing else', () => {
    const plank = customExercise({ id: 'custom:plank', name: 'Планка', kind: 'duration' });
    const lookup = exerciseLookup([plank]);

    expect(lookup('pullups')).toBe(PULLUPS);
    expect(lookup('custom:plank')).toBe(plank);
    expect(lookup('deleted')).toBeUndefined();
    expect(exerciseLookup()('custom:plank')).toBeUndefined();
  });
});

describe('isRace', () => {
  it('is true for distances and shuttle runs against the clock', () => {
    expect([RUN, SPRINT, SHUTTLE].every(isRace)).toBe(true);
    expect([PULLUPS, BENCH_PRESS].some(isRace)).toBe(false);
  });
});

describe('disciplineKey', () => {
  it('separates the distances of a run', () => {
    expect(disciplineKey(RUN, { ...none, distanceM: 5000 })).toBe('run@5000');
    expect(disciplineKey(RUN, { ...none, distanceM: 3000 })).toBe('run@3000');
  });

  it('treats 0.4 km and 400 m as one distance', () => {
    expect(disciplineKey(RUN, { ...none, distanceM: 0.4 * 1000 })).toBe(disciplineKey(RUN, { ...none, distanceM: 400 }));
  });

  it('separates shuttle schemes', () => {
    expect(disciplineKey(SHUTTLE, { distanceM: 9, segments: 4 })).toBe('shuttle@4x9');
    expect(disciplineKey(SHUTTLE, { distanceM: 10, segments: 10 })).toBe('shuttle@10x10');
  });

  it('falls back to the exercise when the distance is not known', () => {
    expect(disciplineKey(RUN, none)).toBe('run');
    expect(disciplineKey(SHUTTLE, { distanceM: 10, segments: null })).toBe('shuttle');
  });

  it('is the exercise itself for everything else', () => {
    expect(disciplineKey(PULLUPS, { distanceM: 100, segments: 4 })).toBe('pullups');
  });
});

describe('roundMetres', () => {
  it('rounds to the centimetre', () => {
    expect(roundMetres(0.1 + 0.2)).toBe(0.3);
    expect(roundMetres(21097.5)).toBe(21097.5);
    expect(roundMetres(2.4 * 1000)).toBe(2400);
  });
});

describe('choosesDirection', () => {
  it('lets a bare time or a bare number go either way, and nothing else', () => {
    expect(EXERCISE_KINDS.filter(choosesDirection)).toEqual(['duration', 'count']);
  });
});

describe('changeExercise', () => {
  const plank = customExercise({ id: 'custom:планка', name: 'Планка', kind: 'duration' });

  it('renames, and keeps the id and the kind', () => {
    expect(changeExercise(plank, { name: '  Планка на ліктях ' })).toEqual({ ...plank, name: 'Планка на ліктях' });
  });

  it('turns the direction of a time around', () => {
    expect(plank.better).toBe('lower');
    expect(changeExercise(plank, { better: 'higher' }).better).toBe('higher');
  });

  it('keeps what is not changed', () => {
    const held = changeExercise(plank, { better: 'higher' });

    expect(changeExercise(held, { name: 'Plank' })).toEqual({ ...held, name: 'Plank' });
  });

  it('sets and clears the unit of a number', () => {
    const stairs = customExercise({ id: 'own:1', name: 'Сходи', kind: 'count', unit: 'поверхів' });

    expect(changeExercise(stairs, { unit: ' прольотів ' }).unit).toBe('прольотів');
    expect(changeExercise(stairs, { unit: '' }).unit).toBeNull();
    expect(changeExercise(stairs, { unit: null }).unit).toBeNull();
    expect(changeExercise(stairs, {}).unit).toBe('поверхів');
  });

  it('switches a distance between kilometres and metres', () => {
    const swim = customExercise({ id: 'own:2', name: 'Плавання', kind: 'distanceTime', distanceUnit: 'km' });

    expect(changeExercise(swim, { distanceUnit: 'm' }).distanceUnit).toBe('m');
  });

  it('ignores a change that does not apply to the kind', () => {
    const march = customExercise({ id: 'own:3', name: 'Марш-кидок', kind: 'distanceTime' });
    const squat = customExercise({ id: 'own:4', name: 'Присідання', kind: 'weight' });
    const diary = customExercise({ id: 'own:5', name: 'Щоденник', kind: 'text' });

    expect(changeExercise(march, { better: 'higher', unit: 'kg' })).toEqual(march);
    expect(changeExercise(squat, { better: 'lower', distanceUnit: 'm' })).toEqual(squat);
    expect(changeExercise(diary, { better: 'higher' })).toEqual(diary);
  });

  it('keeps a direction it was given some other way, such as in a backup', () => {
    const odd = { ...customExercise({ id: 'own:6', name: 'Odd', kind: 'distanceTime' }), better: 'higher' as const };

    expect(changeExercise(odd, { name: 'Still odd' }).better).toBe('higher');
  });

  it('refuses a built-in exercise', () => {
    expect(() => changeExercise(PULLUPS, { name: 'Chin-ups' })).toThrow('built-in');
  });
});
