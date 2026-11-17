// Keeps progress photos out of Android's own cloud backup of the app (docs/database.md).
//
// Android backs up the app's files to the person's Google account on its own, up to 25 MB per
// app, and backs up nothing at all once the app has more. A handful of photos is enough for
// that, and the database with every record would stop being backed up with them. So the
// photos stay out of the cloud backup; a direct transfer to a new phone still takes them on
// Android 12 and newer, which keep separate rules for it.
const fs = require('node:fs');
const path = require('node:path');

const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

/** The folder with the copies of progress photos among the app's files (src/photos/files.ts). */
const PHOTOS_FOLDER = 'progress-photos';

/** Android 12 and newer. With no rules for a transfer between phones, that takes everything. */
const DATA_EXTRACTION_RULES = `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
  <cloud-backup>
    <exclude domain="file" path="${PHOTOS_FOLDER}"/>
  </cloud-backup>
</data-extraction-rules>
`;

/** Android 11 and older have one set of rules for the cloud and for a transfer between phones. */
const FULL_BACKUP_CONTENT = `<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
  <exclude domain="file" path="${PHOTOS_FOLDER}"/>
</full-backup-content>
`;

const FILES = { 'data_extraction_rules.xml': DATA_EXTRACTION_RULES, 'backup_rules.xml': FULL_BACKUP_CONTENT };

function withBackupRules(config) {
  config = withAndroidManifest(config, (config) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    application.$['android:dataExtractionRules'] = '@xml/data_extraction_rules';
    application.$['android:fullBackupContent'] = '@xml/backup_rules';
    return config;
  });

  return withDangerousMod(config, [
    'android',
    async (config) => {
      const folder = path.join(config.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
      await fs.promises.mkdir(folder, { recursive: true });
      for (const [name, content] of Object.entries(FILES)) {
        await fs.promises.writeFile(path.join(folder, name), content);
      }
      return config;
    },
  ]);
}

module.exports = withBackupRules;
module.exports.PHOTOS_FOLDER = PHOTOS_FOLDER;
