import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { readBackup } from '@/backup/format';
import { accessFrom, evaluateAchievements, exerciseLookup, isOpen, SLOTS } from '@/domain';

/**
 * The made-up histories the store screenshots are taken with (scripts/build-demo-backup.py).
 * Each must restore like any backup, and the look it carries must be one the history opens, or
 * the screenshots would show a camp the app does not draw.
 */
for (const language of ['uk', 'en']) {
  describe(`the ${language} demo history`, () => {
    const text = readFileSync(join(__dirname, '..', '..', 'store', `demo-backup.${language}.json`), 'utf8');
    const read = readBackup(text);

    it('restores like any backup', () => {
      expect(read).toMatchObject({ ok: true });
    });

    it('opens every item its camp wears, without premium', () => {
      if (!read.ok) throw new Error('The demo history does not restore');
      const { entries, exercises, bodyWeights, look } = read.backup;
      const states = evaluateAchievements(
        { entries, exercises: exerciseLookup(exercises), weights: bodyWeights },
        { soberDays: null },
      );
      const access = accessFrom(states, false);
      for (const slot of SLOTS) expect({ slot, open: isOpen(slot, look[slot], access) }).toEqual({ slot, open: true });
    });
  });
}
