import { bodyMapOf } from '../body';

describe('bodyMapOf', () => {
  it('gives each measured part its latest value and the change since the one before', () => {
    expect(
      bodyMapOf([
        { date: '2026-01-01', part: 'waist', cm: 84 },
        { date: '2026-01-01', part: 'neck', cm: 38 },
        { date: '2026-02-01', part: 'neck', cm: 38.5 },
        { date: '2026-03-01', part: 'waist', cm: 82 },
        { date: '2026-03-01', part: 'chest', cm: 100 },
      ]),
    ).toEqual([
      { part: 'neck', cm: 38.5, date: '2026-02-01', change: 0.5 },
      { part: 'chest', cm: 100, date: '2026-03-01', change: null },
      { part: 'waist', cm: 82, date: '2026-03-01', change: -2 },
    ]);
  });

  it('compares a part with its own earlier value, whatever came between', () => {
    expect(
      bodyMapOf([
        { date: '2026-03-01', part: 'bicep', cm: 38 },
        { date: '2026-01-01', part: 'bicep', cm: 36 },
        { date: '2026-02-01', part: 'calf', cm: 39 },
      ]),
    ).toEqual([
      { part: 'bicep', cm: 38, date: '2026-03-01', change: 2 },
      { part: 'calf', cm: 39, date: '2026-02-01', change: null },
    ]);
  });

  it('leaves out a part of the person\'s own, which has no place on the figure', () => {
    expect(bodyMapOf([{ date: '2026-01-01', part: 'own:wrist', cm: 17 }])).toEqual([]);
  });
});
