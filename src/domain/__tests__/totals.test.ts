import { BENCH_PRESS, DIPS, PULLUPS, PUSHUPS, RUN, SHUTTLE, SPRINT } from '../exercises';
import { lifetimeTotals } from '../totals';

import { entry, history, minutes, resetSequence, seconds } from './support';

beforeEach(resetSequence);

describe('lifetimeTotals', () => {
  it('starts from zero', () => {
    expect(lifetimeTotals(history([]))).toEqual({ pullups: 0, pushups: 0, dips: 0, runKm: 0, otherEntries: 0 });
  });

  it('adds up reps of the classics and kilometres of runs', () => {
    const totals = lifetimeTotals(
      history([
        entry(PULLUPS, '2026-02-01', { reps: 12, loadKg: 20 }),
        entry(PULLUPS, '2026-02-02', { reps: 8 }),
        entry(PUSHUPS, '2026-02-02', { reps: 40 }),
        entry(DIPS, '2026-02-03', { reps: 15 }),
        entry(RUN, '2026-02-03', { distanceM: 5000, durationMs: minutes(25) }),
        entry(RUN, '2026-02-04', { distanceM: 2500, durationMs: minutes(12) }),
      ]),
    );

    expect(totals).toEqual({ pullups: 20, pushups: 40, dips: 15, runKm: 7.5, otherEntries: 0 });
  });

  it('leaves sprints and shuttle runs out, as Record does', () => {
    const totals = lifetimeTotals(
      history([
        entry(SPRINT, '2026-02-01', { distanceM: 100, durationMs: seconds(12.5) }),
        entry(SHUTTLE, '2026-02-01', { segments: 4, distanceM: 9, durationMs: seconds(9.8) }),
      ]),
    );
    expect(totals).toEqual({ pullups: 0, pushups: 0, dips: 0, runKm: 0, otherEntries: 0 });
  });

  it('counts every other entry once', () => {
    const totals = lifetimeTotals(
      history([
        entry(BENCH_PRESS, '2026-02-01', { reps: 5, loadKg: 100 }),
        entry('custom:plank', '2026-02-01', { durationMs: minutes(2) }),
        entry('custom:plank', '2026-02-02', { durationMs: minutes(3) }),
      ]),
    );
    expect(totals.otherEntries).toBe(3);
  });

  it('adds nothing for results whose numbers are missing', () => {
    const totals = lifetimeTotals(
      history([entry(PULLUPS, '2026-02-01', { text: 'багато' }), entry(RUN, '2026-02-01', { durationMs: minutes(25) })]),
    );
    expect(totals).toMatchObject({ pullups: 0, runKm: 0 });
  });
});
