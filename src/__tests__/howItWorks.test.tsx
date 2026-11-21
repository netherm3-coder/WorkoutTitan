import { userEvent } from '@testing-library/react-native';
import { getLocales } from 'expo-localization';
import { renderRouter, screen } from 'expo-router/testing-library';

import { addEntries, type Connection } from '@/db';
import { openTestDatabase } from '@/db/__tests__/testDatabase';
import { openRecordDatabase } from '@/db/open';
import { dayOf, PULLUPS, RM_REPS_CAP, STATUS_LEVELS, STATUS_WINDOW_DAYS } from '@/domain';
import { entry } from '@/domain/__tests__/support';
import en from '@/i18n/locales/en.json';
import uk from '@/i18n/locales/uk.json';

jest.mock('expo-localization', () => ({ getLocales: jest.fn() }));

const open = jest.mocked(openRecordDatabase);

/** Starts the app on a database of its own. */
async function startApp(initialUrl: string, seed?: (db: Connection) => Promise<void>) {
  const db = await openTestDatabase();
  await seed?.(db);
  open.mockResolvedValueOnce(db);

  await renderRouter('src/app', { initialUrl });
  await screen.findAllByRole('header');
  return { user: userEvent.setup() };
}

const SECTIONS = Object.values(en.help.sections).map((section) => section.title);

beforeEach(() => {
  jest.mocked(getLocales).mockReturnValue([{ languageCode: 'en', regionCode: 'GB' }] as unknown as ReturnType<typeof getLocales>);
});

describe('how it works', () => {
  it('opens from the settings and explains every rule of the sport part', async () => {
    const { user } = await startApp('/settings');

    await user.press(screen.getByRole('link', { name: 'How it works' }));

    expect(await screen.findByRole('header', { name: 'How it works' })).toBeOnTheScreen();
    for (const title of SECTIONS) expect(screen.getByRole('header', { name: title })).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByRole('header', { name: 'Settings' })).toBeOnTheScreen();
  });

  it('opens from the sport status on the home screen', async () => {
    const { user } = await startApp('/', (db) => addEntries(db, [entry(PULLUPS, dayOf(new Date()), { reps: 10 })], 1));

    await user.press(screen.getByRole('link', { name: 'How the status is worked out' }));

    expect(await screen.findByRole('header', { name: 'How it works' })).toBeOnTheScreen();
  });

  it('gives the numbers the app counts with, in both languages', () => {
    expect(Object.keys(uk.help.sections)).toEqual(Object.keys(en.help.sections));

    for (const level of STATUS_LEVELS) {
      expect(en.help.sections.status.body).toContain(`${en.status.levels[level.id]} from ${level.from.toFixed(1)}`);
      expect(uk.help.sections.status.body).toContain(`${uk.status.levels[level.id]} від ${level.from.toFixed(1).replace('.', ',')}`);
    }
    expect(en.help.sections.status.body).toContain(`last ${STATUS_WINDOW_DAYS} days`);
    expect(uk.help.sections.status.body).toContain(`останні ${STATUS_WINDOW_DAYS} днів`);
    expect(en.help.sections.oneRepMax.body).toContain(`Reps above ${RM_REPS_CAP} count as ${RM_REPS_CAP}`);
    expect(uk.help.sections.oneRepMax.body).toContain(`Повтори понад ${RM_REPS_CAP} рахуються як ${RM_REPS_CAP}`);
  });
});
