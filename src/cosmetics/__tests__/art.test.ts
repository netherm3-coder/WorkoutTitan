import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { DEFAULT_LOOK, type Look } from '@/domain';

import { sceneLayers } from '../sceneLayers';

const ROOT = join(__dirname, '..', '..', '..');
const SCENE = join(ROOT, 'assets', 'scene');

/** Every file under a folder, as paths relative to it. */
function filesUnder(folder: string): string[] {
  return readdirSync(folder).flatMap((name) => {
    const path = join(folder, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

/*
 * Inside tests every picture is the same stub, so the table itself is read as text here. That
 * the table has a picture for every item of the catalogue is checked by the compiler
 * (`satisfies` in art.ts); this checks the other half, that the pictures are really there.
 */
describe('the art table', () => {
  const table = readFileSync(join(ROOT, 'src', 'cosmetics', 'art.ts'), 'utf8');
  const required = [...table.matchAll(/require\('@\/assets\/scene\/([^']+)'\)/g)].map((match) => match[1] ?? '');
  const onDisk = filesUnder(SCENE).map((path) => relative(SCENE, path).split('\\').join('/'));

  it('points only at pictures that exist', () => {
    expect(required.filter((path) => !existsSync(join(SCENE, path)))).toEqual([]);
  });

  it('uses every picture in the folder exactly once', () => {
    expect([...required].sort()).toEqual([...onDisk].sort());
  });

  it('has the fire, 25 skies, 65 tents, 72 patterns, 12 knights, and 20 hats with their tiles', () => {
    const count = (folder: string) => required.filter((path) => path.startsWith(`${folder}/`)).length;

    expect(required).toContain('campfire.gif');
    expect(['sky', 'tent', 'pattern', 'knight', 'hat', 'hat-tile'].map(count)).toEqual([25, 65, 72, 12, 20, 20]);
  });

  it('names a picture by the two ids that choose it', () => {
    expect(table).toContain("starry: {\n    bare: require('@/assets/scene/sky/starry-bare.webp'),");
    expect(table).toContain("    winter: require('@/assets/scene/tent/lightBlue-winter.webp'),");
    expect(table).toContain("    yellow: require('@/assets/scene/pattern/stripes-yellow.webp'),");
    expect(table).toContain("  ushanka: require('@/assets/scene/hat/ushanka.webp'),");
  });

  it('keeps the bundled scene small', () => {
    const bytes = filesUnder(SCENE).reduce((total, path) => total + statSync(path).size, 0);

    // The originals are about 40 MB. If this grows past 12 MB, something went in uncompressed.
    expect(bytes).toBeLessThan(12_000_000);
  });
});

describe('sceneLayers', () => {
  const keys = (look: Look) => sceneLayers(look).map((layer) => layer.key);

  it('stacks the starting camp back to front, without a hat or a pattern', () => {
    expect(keys(DEFAULT_LOOK)).toEqual(['sky', 'tent', 'knight', 'campfire']);
  });

  it('puts the pattern on the tent and the hat on the knight, with the fire in front of everything', () => {
    expect(keys({ ...DEFAULT_LOOK, hat: 'crown', pattern: 'dots' })).toEqual(['sky', 'tent', 'pattern', 'knight', 'hat', 'campfire']);
  });

  it('has a picture for every layer', () => {
    for (const layer of sceneLayers({ ...DEFAULT_LOOK, hat: 'duck', pattern: 'hearts', sky: 'sunset', season: 'cherry', tent: 'pink' })) {
      expect(layer.source).toBeTruthy();
    }
  });
});
