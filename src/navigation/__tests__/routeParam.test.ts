import { fromRouteParam, toRouteParam } from '../routeParam';

describe('an id in the address of a screen', () => {
  it.each([
    ['letters and digits', 'mhx2k9a00abcdefghijkl'],
    ['a row of Record’s file', 'csv:2026-03-01|Підтягування 2/3 #1?a=b&c|12 (+20%) 50%2F#1'],
    ['something that looks encoded already', '%2F%25%E2%82%AC'],
    ['a discipline at a distance', 'run@5000'],
    ['an exercise of the person’s own', 'custom:біг-по-сходах'],
    ['letters beyond the basic plane', 'віджимання 💪🏽 𝔸'],
    ['spaces and line breaks', ' a\tb\nc '],
    ['the characters of an address', "/?#[]@!$&'()*+,;=%"],
  ])('comes back exactly for %s', (_, id) => {
    expect(fromRouteParam(toRouteParam(id))).toBe(id);
  });

  it('is made only of hex digits, which an address never changes', () => {
    const param = toRouteParam('csv:2026-03-01|Планка|3:00#1');

    expect(param).toMatch(/^[0-9a-f]+$/);
    expect(encodeURIComponent(param)).toBe(param);
    expect(decodeURIComponent(decodeURIComponent(param))).toBe(param);
  });

  it('is plain to read for plain ids', () => {
    expect(toRouteParam('run@5000')).toBe('72756e4035303030');
  });

  it('takes the first value when the router hands over several', () => {
    expect(fromRouteParam([toRouteParam('a'), toRouteParam('b')])).toBe('a');
  });

  it('accepts capital hex digits', () => {
    expect(fromRouteParam('C3A9')).toBe('é');
  });

  it.each([
    ['nothing', undefined],
    ['an empty value', ''],
    ['an empty list', []],
    ['an id written plainly', 'plain-id'],
    ['an odd number of digits', 'abc'],
    ['bytes that are not UTF-8', 'c328'],
  ])('is refused for %s', (_, param) => {
    expect(fromRouteParam(param)).toBeNull();
  });
});
