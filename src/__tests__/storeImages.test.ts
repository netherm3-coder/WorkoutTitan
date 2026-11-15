import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The screenshots and the feature graphic for the Google Play page (scripts/build-store-images.py).
 * Play Console refuses pictures of the wrong size or kind, so their headers are checked here.
 */
const STORE = join(__dirname, '..', '..', 'store');

/** Width and height from a JPEG's frame header. */
function jpeg(path: string): { width: number; height: number } {
  const bytes = readFileSync(path);
  expect([bytes[0], bytes[1]]).toEqual([0xff, 0xd8]);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let at = 2;
  while (at < bytes.length) {
    const marker = view.getUint16(at);
    const length = view.getUint16(at + 2);
    // Start of frame, baseline or progressive: height, then width.
    if (marker === 0xffc0 || marker === 0xffc2) return { height: view.getUint16(at + 5), width: view.getUint16(at + 7) };
    at += 2 + length;
  }
  throw new Error(`No frame header in ${path}`);
}

const shots = (language: string) => readdirSync(join(STORE, 'screenshots', language)).sort();

describe('the pictures for the Google Play page', () => {
  it('have the same screens in both languages, between two and eight of them', () => {
    expect(shots('uk')).toEqual(shots('en'));
    expect(shots('uk').length).toBeGreaterThanOrEqual(2);
    expect(shots('uk').length).toBeLessThanOrEqual(8);
  });

  for (const language of ['uk', 'en']) {
    it(`are phone screenshots of 1080x1920 in ${language}`, () => {
      for (const name of shots(language)) {
        expect({ name, size: jpeg(join(STORE, 'screenshots', language, name)) }).toEqual({
          name,
          size: { width: 1080, height: 1920 },
        });
      }
    });

    it(`include a feature graphic of 1024x500 in ${language}`, () => {
      const path = join(STORE, `feature-graphic.${language}.jpg`);
      expect(existsSync(path)).toBe(true);
      expect(jpeg(path)).toEqual({ width: 1024, height: 500 });
    });
  }
});
