/**
 * Small colour maths used to keep every skin readable.
 * Only the formats the themes actually use are supported: #rgb, #rrggbb, rgb() and rgba().
 */

export type Rgba = { r: number; g: number; b: number; a: number };

const HEX_SHORT = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i;
const HEX_LONG = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
const FUNCTIONAL = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i;

export function parseColor(input: string): Rgba {
  const value = input.trim();

  const long = HEX_LONG.exec(value);
  if (long) {
    return { r: hex(long[1]), g: hex(long[2]), b: hex(long[3]), a: 1 };
  }

  const short = HEX_SHORT.exec(value);
  if (short) {
    return { r: hex(double(short[1])), g: hex(double(short[2])), b: hex(double(short[3])), a: 1 };
  }

  const fn = FUNCTIONAL.exec(value);
  if (fn) {
    return {
      r: Number(fn[1]),
      g: Number(fn[2]),
      b: Number(fn[3]),
      a: fn[4] === undefined ? 1 : Number(fn[4]),
    };
  }

  throw new Error(`Unsupported colour format: "${input}"`);
}

/** The same colour at a new opacity, as an `rgba()` string. */
export function withAlpha(color: string, alpha: number): string {
  const { r, g, b } = parseColor(color);
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;
}

/** Paints `top` over an opaque `bottom` and returns the opaque result. */
export function composite(top: Rgba, bottom: Rgba): Rgba {
  const mix = (over: number, under: number) => over * top.a + under * (1 - top.a);
  return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a: 1 };
}

/** WCAG 2.x relative luminance of an opaque colour. */
export function relativeLuminance({ r, g, b }: Rgba): number {
  const channel = (value: number) => {
    const s = value / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG 2.x contrast ratio between two opaque colours, from 1 to 21. */
export function contrastRatio(a: Rgba, b: Rgba): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

function hex(pair: string | undefined): number {
  return parseInt(pair ?? '00', 16);
}

function double(digit: string | undefined): string {
  return `${digit ?? '0'}${digit ?? '0'}`;
}
