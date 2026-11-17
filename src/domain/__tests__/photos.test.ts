import { photoDays } from '../photos';

const photo = (id: string, date: string, createdAt: number) => ({ id, date, file: `${id}.jpg`, createdAt });

describe('photoDays', () => {
  it('groups photos by day, newest day and newest photo first', () => {
    expect(photoDays([photo('a', '2026-01-01', 1), photo('b', '2026-03-01', 2), photo('c', '2026-01-01', 3)])).toEqual([
      { date: '2026-03-01', photos: [photo('b', '2026-03-01', 2)] },
      { date: '2026-01-01', photos: [photo('c', '2026-01-01', 3), photo('a', '2026-01-01', 1)] },
    ]);
  });

  it('has no days without photos', () => {
    expect(photoDays([])).toEqual([]);
  });
});
