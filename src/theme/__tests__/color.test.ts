import { composite, contrastRatio, parseColor, relativeLuminance } from '../color';

describe('parseColor', () => {
  it('reads long and short hex', () => {
    expect(parseColor('#723a45')).toEqual({ r: 114, g: 58, b: 69, a: 1 });
    expect(parseColor('#FfF')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
  });

  it('reads rgb() and rgba()', () => {
    expect(parseColor('rgb(1, 2, 3)')).toEqual({ r: 1, g: 2, b: 3, a: 1 });
    expect(parseColor('rgba(40, 22, 26, 0.8)')).toEqual({ r: 40, g: 22, b: 26, a: 0.8 });
    expect(parseColor(' rgba(0,0,0,0) ')).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });

  it('rejects formats the themes do not use', () => {
    expect(() => parseColor('tomato')).toThrow('Unsupported colour format');
    expect(() => parseColor('#12345')).toThrow('Unsupported colour format');
    expect(() => parseColor('hsl(0, 0%, 0%)')).toThrow('Unsupported colour format');
  });
});

describe('composite', () => {
  const white = parseColor('#ffffff');
  const black = parseColor('#000000');

  it('keeps an opaque top colour and a fully transparent one shows the bottom', () => {
    expect(composite(black, white)).toEqual(black);
    expect(composite({ ...black, a: 0 }, white)).toEqual(white);
  });

  it('mixes by alpha', () => {
    expect(composite({ ...black, a: 0.5 }, white)).toEqual({ r: 127.5, g: 127.5, b: 127.5, a: 1 });
  });
});

describe('contrast', () => {
  const white = parseColor('#ffffff');
  const black = parseColor('#000000');

  it('matches the WCAG reference points', () => {
    expect(relativeLuminance(white)).toBeCloseTo(1, 5);
    expect(relativeLuminance(black)).toBeCloseTo(0, 5);
    expect(contrastRatio(white, black)).toBeCloseTo(21, 5);
    expect(contrastRatio(white, white)).toBeCloseTo(1, 5);
  });

  it('does not depend on argument order', () => {
    const maroon = parseColor('#723a45');
    expect(contrastRatio(maroon, white)).toBeCloseTo(contrastRatio(white, maroon), 10);
  });

  it('agrees with a published value', () => {
    // #767676 on white is the classic "just passes AA" grey: 4.54:1.
    expect(contrastRatio(parseColor('#767676'), white)).toBeCloseTo(4.54, 2);
  });
});
