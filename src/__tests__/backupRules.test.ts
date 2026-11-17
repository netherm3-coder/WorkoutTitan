import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import appJson from '../../app.json';
import withBackupRules from '../../plugins/withBackupRules';

/**
 * Android's own cloud backup of the app (plugins/withBackupRules.js, docs/database.md). It holds
 * 25 MB per app and backs up nothing once the app has more, so the photos stay out of it and the
 * database with the records keeps being backed up.
 */
type Mod = (config: object) => Promise<{ modResults: unknown }>;

const ROOT = join(__dirname, '..', '..');

/** The plugin applied to a bare config, with the steps it adds to the generation of the Android project. */
function applied() {
  const config = withBackupRules({ name: 'Record', slug: 'record' });
  return { config, mods: (config as unknown as { mods: { android: { manifest: Mod; dangerous: Mod } } }).mods.android };
}

/** The rules the plugin writes into a generated Android project, by file name. */
async function writtenRules(): Promise<Record<string, string>> {
  const projectRoot = mkdtempSync(join(tmpdir(), 'backup-rules-'));
  try {
    const { config, mods } = applied();
    const platformProjectRoot = join(projectRoot, 'android');
    await mods.dangerous({
      ...config,
      modResults: {},
      modRequest: { platform: 'android', modName: 'dangerous', projectRoot, platformProjectRoot, introspect: false },
    });
    const folder = join(platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
    return Object.fromEntries(readdirSync(folder).map((name) => [name, readFileSync(join(folder, name), 'utf8')]));
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
}

const excludes = (xml: string) => [...xml.matchAll(/<exclude domain="(\w+)" path="([^"]+)"\/>/g)].map(([, domain, path]) => `${domain}:${path}`);

describe("Android's backup of the app", () => {
  it('is set up by the app config', () => {
    expect(appJson.expo.plugins).toContain('./plugins/withBackupRules');
  });

  it('points the app at both sets of rules: Android 12 and newer, and the older ones', async () => {
    const { config, mods } = applied();
    const manifest = {
      manifest: { $: {}, application: [{ $: { 'android:name': '.MainApplication', 'android:allowBackup': 'true' } }] },
    };

    const result = await mods.manifest({
      ...config,
      modResults: manifest,
      modRequest: { platform: 'android', modName: 'manifest', projectRoot: ROOT, platformProjectRoot: join(ROOT, 'android'), introspect: false },
    });

    expect(result.modResults).toEqual({
      manifest: {
        $: {},
        application: [
          {
            $: {
              'android:name': '.MainApplication',
              'android:allowBackup': 'true',
              'android:dataExtractionRules': '@xml/data_extraction_rules',
              'android:fullBackupContent': '@xml/backup_rules',
            },
          },
        ],
      },
    });
  });

  it('leaves the photos out of the cloud and keeps everything else, the database included', async () => {
    const rules = await writtenRules();

    expect(Object.keys(rules).sort()).toEqual(['backup_rules.xml', 'data_extraction_rules.xml']);
    for (const xml of Object.values(rules)) {
      // An <include> would stop Android from backing up everything not named in it.
      expect(xml).not.toContain('<include');
      expect(excludes(xml)).toEqual(['file:progress-photos']);
    }
    expect(rules['data_extraction_rules.xml']).toMatch(/<cloud-backup>\s*<exclude [^>]+\/>\s*<\/cloud-backup>/);
  });

  it('lets a transfer between phones on Android 12 and newer take the photos too', async () => {
    // With no rules for a transfer, Android transfers everything.
    expect((await writtenRules())['data_extraction_rules.xml']).not.toContain('device-transfer');
  });

  it('names the folder the app keeps the photos in', () => {
    const files = readFileSync(join(ROOT, 'src', 'photos', 'files.ts'), 'utf8');
    expect(files).toContain(`new Directory(Paths.document, '${withBackupRules.PHOTOS_FOLDER}')`);
    expect(withBackupRules.PHOTOS_FOLDER).toBe('progress-photos');
  });
});
