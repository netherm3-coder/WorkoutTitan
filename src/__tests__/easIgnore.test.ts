import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import appJson from '../../app.json';

/**
 * What `eas build` uploads (.easignore, docs/release.md). EAS CLI reads .easignore instead of
 * .gitignore, so a rule missing there sends keys or a stale native folder to the build server,
 * and a folder left out by mistake breaks the build on the server, where it is hard to see why.
 */
const ROOT = join(__dirname, '..', '..');

/** The folders that .easignore leaves out on top of .gitignore: the build never reads them. */
const NOT_FOR_THE_BUILD = ['assets/AppAssets', 'store'];

/** The rules of an ignore file, without comments and blank lines. */
const rules = (file: string) =>
  readFileSync(join(ROOT, file), 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'));

/** Every source file of the app under a folder, tests left aside. */
function sources(folder: string): string[] {
  return readdirSync(folder).flatMap((name) => {
    const path = join(folder, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sources(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

/** The files that the app's code requires, as paths from the project root. */
function required(): string[] {
  return sources(join(ROOT, 'src')).flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)].flatMap(([, target = '']) => {
      if (target.startsWith('@/assets/')) return [target.slice('@/'.length)];
      if (target.startsWith('.')) return [relative(ROOT, join(file, '..', target))];
      return [];
    }),
  );
}

/** The files that app.json points to: the icons and the splash picture. */
function configured(value: unknown): string[] {
  if (typeof value === 'string') return value.startsWith('./') ? [value.slice('./'.length)] : [];
  if (Array.isArray(value)) return value.flatMap(configured);
  if (value !== null && typeof value === 'object') return Object.values(value).flatMap(configured);
  return [];
}

describe('the upload to EAS Build', () => {
  const easignore = rules('.easignore');
  const gitignore = rules('.gitignore');

  it('leaves out everything that Git leaves out: keys, local settings, native folders', () => {
    expect(easignore).toEqual(expect.arrayContaining(gitignore));
  });

  it('also leaves out the Git copy and the folders that the build never reads, and nothing else', () => {
    expect(easignore.filter((rule) => !gitignore.includes(rule))).toEqual([
      '.git',
      ...NOT_FOR_THE_BUILD.map((folder) => `/${folder}`),
    ]);
  });

  it('keeps every file that the app and its build read', () => {
    const used = [...required(), ...configured(appJson)];
    expect(used).toContain(appJson.expo.icon.slice('./'.length));
    expect(used.filter((path) => path.startsWith('assets/scene/')).length).toBeGreaterThan(100);
    expect(used.filter((path) => NOT_FOR_THE_BUILD.some((folder) => path.startsWith(`${folder}/`)))).toEqual([]);
  });
});
