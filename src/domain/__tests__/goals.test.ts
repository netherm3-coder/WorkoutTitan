import { NO_MEASURES } from '../entry';
import { customExercise, PULLUPS, RUN } from '../exercises';
import { goalProgress, isValidGoal, MAX_GOAL, reachesGoal } from '../goals';

import { minutes } from './support';

const NOTES = customExercise({ id: 'notes', name: 'Нотатки', kind: 'text' });

describe('isValidGoal', () => {
  it('accepts positive numbers up to a million reps or kilograms', () => {
    expect(isValidGoal(20, PULLUPS)).toBe(true);
    expect(isValidGoal(0.5, PULLUPS)).toBe(true);
    expect(isValidGoal(MAX_GOAL, PULLUPS)).toBe(true);
  });

  it.each([0, -5, NaN, Infinity, MAX_GOAL + 1])('rejects %s reps', (goal) => {
    expect(isValidGoal(goal, PULLUPS)).toBe(false);
  });

  it('accepts times up to a million seconds, which are kept in milliseconds', () => {
    expect(isValidGoal(minutes(20), RUN)).toBe(true);
    expect(isValidGoal(minutes(3 * 60 + 30), RUN)).toBe(true);
    expect(isValidGoal(minutes(2), customExercise({ id: 'plank', name: 'Планка', kind: 'duration' }))).toBe(true);
    expect(isValidGoal(MAX_GOAL * 1000, RUN)).toBe(true);
    expect(isValidGoal(MAX_GOAL * 1000 + 1, RUN)).toBe(false);
  });

  it('gives results in words no goals', () => {
    expect(isValidGoal(1, NOTES)).toBe(false);
  });
});

describe('goalProgress', () => {
  it('is the share of the goal already reached', () => {
    expect(goalProgress({ peak: 15, exercise: PULLUPS }, 20)).toBe(75);
    expect(goalProgress({ peak: 20, exercise: PULLUPS }, 20)).toBe(100);
  });

  it('stops at 100', () => {
    expect(goalProgress({ peak: 30, exercise: PULLUPS }, 20)).toBe(100);
  });

  it('turns around for times: the goal over the best time', () => {
    expect(goalProgress({ peak: minutes(25), exercise: RUN }, minutes(20))).toBe(80);
    expect(goalProgress({ peak: minutes(19), exercise: RUN }, minutes(20))).toBe(100);
  });

  it('is zero without a result or a goal', () => {
    expect(goalProgress({ peak: null, exercise: PULLUPS }, 20)).toBe(0);
    expect(goalProgress({ peak: 15, exercise: PULLUPS }, 0)).toBe(0);
  });
});

describe('reachesGoal', () => {
  it('is true the first time a result gets to the goal', () => {
    expect(reachesGoal({ ...NO_MEASURES, reps: 20 }, PULLUPS, 20, 18)).toBe(true);
    expect(reachesGoal({ ...NO_MEASURES, reps: 22 }, PULLUPS, 20, null)).toBe(true);
  });

  it('is false short of the goal, and after it was already reached', () => {
    expect(reachesGoal({ ...NO_MEASURES, reps: 19 }, PULLUPS, 20, 18)).toBe(false);
    expect(reachesGoal({ ...NO_MEASURES, reps: 21 }, PULLUPS, 20, 20)).toBe(false);
  });

  it('means getting under the time for a race', () => {
    const run = (durationMs: number) => ({ ...NO_MEASURES, distanceM: 5000, durationMs });

    expect(reachesGoal(run(minutes(19, 50)), RUN, minutes(20), minutes(21))).toBe(true);
    expect(reachesGoal(run(minutes(20, 10)), RUN, minutes(20), minutes(21))).toBe(false);
    expect(reachesGoal(run(minutes(19)), RUN, minutes(20), minutes(19, 30))).toBe(false);
  });

  it('is never true for results without a number', () => {
    expect(reachesGoal({ ...NO_MEASURES, text: 'легко' }, NOTES, 1, null)).toBe(false);
    expect(reachesGoal({ ...NO_MEASURES }, PULLUPS, 1, null)).toBe(false);
  });
});
