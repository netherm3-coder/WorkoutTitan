import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import appJson from '../../app.json';

const ROOT = join(__dirname, '..', '..');

/** Width and height of a PNG, from its header, and whether it has an alpha channel. */
function png(path: string) {
  const bytes = readFileSync(join(ROOT, path));
  expect(String.fromCharCode(...bytes.subarray(1, 4))).toBe('PNG');
  const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // Colour types 4 and 6 carry alpha; 2 is plain RGB.
  return { width: header.getUint32(16), height: header.getUint32(20), alpha: [4, 6].includes(header.getUint8(25)) };
}

const splash = appJson.expo.plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen') as [
  string,
  { image: string; backgroundColor: string },
];

describe('what the build is made of', () => {
  it('has a full square icon without transparency, which iOS and the store need', () => {
    expect(png(appJson.expo.icon)).toEqual({ width: 1024, height: 1024, alpha: false });
    expect(png('store/icon-512.png')).toEqual({ width: 512, height: 512, alpha: false });
  });

  it('has the three layers of an Android adaptive icon', () => {
    const { foregroundImage, backgroundImage, monochromeImage } = appJson.expo.android.adaptiveIcon;
    expect(png(foregroundImage)).toEqual({ width: 1024, height: 1024, alpha: true });
    expect(png(backgroundImage)).toEqual({ width: 1024, height: 1024, alpha: false });
    expect(png(monochromeImage)).toEqual({ width: 1024, height: 1024, alpha: true });
  });

  it('has a splash picture on the splash colour', () => {
    expect(png(splash[1].image)).toMatchObject({ width: 1024, height: 1024, alpha: true });
    expect(splash[1].backgroundColor).toBe('#373048');
  });
});
