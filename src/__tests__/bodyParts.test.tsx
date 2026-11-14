import { userEvent } from '@testing-library/react-native';
import { getLocales } from 'expo-localization';
import { renderRouter, screen } from 'expo-router/testing-library';

import {
  deleteBodyPart,
  listBodyMeasurements,
  listBodyParts,
  listDeletedBodyParts,
  saveBodyMeasurements,
  saveBodyPart,
  type Connection,
} from '@/db';
import { openTestDatabase } from '@/db/__tests__/testDatabase';
import { openRecordDatabase } from '@/db/open';
import { dayOf } from '@/domain';

jest.mock('expo-localization', () => ({ getLocales: jest.fn() }));

const today = dayOf(new Date());
const WRIST = { id: 'own:wrist', name: 'Wrist' };

async function startApp(initialUrl: string, seed?: (db: Connection) => Promise<void>) {
  const db = await openTestDatabase();
  await seed?.(db);
  jest.mocked(openRecordDatabase).mockResolvedValueOnce(db);

  await renderRouter('src/app', { initialUrl });
  await screen.findAllByRole('header');
  return { db, user: userEvent.setup() };
}

/** The wrist as a part of one's own, measured once today. */
async function wrist(db: Connection) {
  await saveBodyPart(db, WRIST, 1);
  await saveBodyMeasurements(db, today, { [WRIST.id]: 17, waist: 81 }, 1);
}

beforeEach(() => {
  const locales = [{ languageCode: 'en', regionCode: 'US' }] as unknown as ReturnType<typeof getLocales>;
  jest.mocked(getLocales).mockReturnValue(locales);
});

describe('body parts of one’s own', () => {
  it('are reached from the settings and from the measurements form', async () => {
    const { user } = await startApp('/settings');
    await user.press(screen.getByRole('link', { name: 'Your measurements' }));
    expect(await screen.findByRole('header', { name: 'Your measurements' })).toBeOnTheScreen();
    expect(screen.getByText('No measurements of your own yet.')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Back' }));
    await user.press(await screen.findByRole('tab', { name: 'Body' }));
    await user.press(await screen.findByRole('button', { name: 'Record measurements' }));
    await user.press(await screen.findByRole('link', { name: 'Your measurements' }));
    expect(await screen.findByRole('header', { name: 'Your measurements' })).toBeOnTheScreen();
  });

  it('are added, and get a field in the measurements form after the built-in ones', async () => {
    const { db, user } = await startApp('/body-parts');

    await user.type(screen.getByLabelText('Name'), ' Wrist ');
    await user.press(screen.getByRole('button', { name: 'Add measurement' }));

    expect(await screen.findByRole('button', { name: 'Rename "Wrist"' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Name')).toHaveDisplayValue('');
    const [added] = await listBodyParts(db);
    expect(added).toEqual({ id: expect.stringMatching(/^own:/), name: 'Wrist' });

    await user.press(screen.getByRole('button', { name: 'Back' }));
    await user.press(await screen.findByRole('tab', { name: 'Body' }));
    await user.press(await screen.findByRole('button', { name: 'Record measurements' }));
    const labels = (await screen.findAllByLabelText(/^(Calf|Wrist)$/)).map((field) => field.props.accessibilityLabel);
    expect(labels).toEqual(['Calf', 'Wrist']);
  });

  it('need a name that no part has, built-in ones included', async () => {
    const { db, user } = await startApp('/body-parts', wrist);

    await user.press(screen.getByRole('button', { name: 'Add measurement' }));
    expect(await screen.findByText('Give the measurement a name.')).toBeOnTheScreen();

    await user.type(screen.getByLabelText('Name'), 'waist');
    await user.press(screen.getByRole('button', { name: 'Add measurement' }));
    expect(await screen.findByText('There already is a measurement with this name.')).toBeOnTheScreen();

    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'WRIST ');
    await user.press(screen.getByRole('button', { name: 'Add measurement' }));
    expect(await screen.findByText('There already is a measurement with this name.')).toBeOnTheScreen();

    expect(await listBodyParts(db)).toEqual([WRIST]);
  });

  it('are measured like the built-in ones and shown on the Body tab by name', async () => {
    const { db, user } = await startApp('/measurements', (database) => saveBodyPart(database, WRIST, 1));

    await user.type(screen.getByLabelText('Wrist'), '17,5');
    await user.press(screen.getByRole('button', { name: 'Save measurements' }));

    expect(await screen.findByLabelText('Wrist: 17.5 cm')).toBeOnTheScreen();
    expect(await listBodyMeasurements(db)).toEqual([{ date: today, part: WRIST.id, cm: 17.5 }]);
  });

  it('are renamed without touching what was measured', async () => {
    const { db, user } = await startApp('/body-parts', wrist);

    await user.press(screen.getByRole('button', { name: 'Rename "Wrist"' }));
    expect(screen.getByLabelText('New name for "Wrist"')).toHaveDisplayValue('Wrist');
    await user.clear(screen.getByLabelText('New name for "Wrist"'));
    await user.type(screen.getByLabelText('New name for "Wrist"'), 'Left wrist');
    await user.press(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('button', { name: 'Rename "Left wrist"' })).toBeOnTheScreen();
    expect(await listBodyParts(db)).toEqual([{ ...WRIST, name: 'Left wrist' }]);
    expect(await listBodyMeasurements(db)).toContainEqual({ date: today, part: WRIST.id, cm: 17 });

    await user.press(screen.getByRole('button', { name: 'Back' }));
    await user.press(await screen.findByRole('tab', { name: 'Body' }));
    expect(await screen.findByLabelText('Left wrist: 17 cm')).toBeOnTheScreen();
  });

  it('keep their name when a rename is cancelled or the new name is taken', async () => {
    const { db, user } = await startApp('/body-parts', wrist);

    await user.press(screen.getByRole('button', { name: 'Rename "Wrist"' }));
    await user.clear(screen.getByLabelText('New name for "Wrist"'));
    await user.type(screen.getByLabelText('New name for "Wrist"'), 'Neck');
    await user.press(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('There already is a measurement with this name.')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByRole('button', { name: 'Rename "Wrist"' })).toBeOnTheScreen();
    expect(await listBodyParts(db)).toEqual([WRIST]);
  });

  it('take their values off the Body tab when deleted, and bring them back', async () => {
    const { db, user } = await startApp('/body', wrist);
    expect(screen.getByLabelText('Wrist: 17 cm')).toBeOnTheScreen();

    await user.press(screen.getByRole('tab', { name: 'Settings' }));
    await user.press(await screen.findByRole('link', { name: 'Your measurements' }));
    await user.press(await screen.findByRole('button', { name: 'Delete the measurement "Wrist"' }));
    expect(screen.getByText('Delete "Wrist"? Its values will leave the Body tab: 1.')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Yes, delete' }));

    expect(await screen.findByText('Deleted measurements')).toBeOnTheScreen();
    expect(screen.getByText('Values: 1')).toBeOnTheScreen();
    expect(await listDeletedBodyParts(db)).toEqual([{ part: WRIST, measurements: 1 }]);

    await user.press(screen.getByRole('button', { name: 'Back' }));
    await user.press(await screen.findByRole('tab', { name: 'Body' }));
    expect(await screen.findByLabelText('Waist: 81 cm')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Wrist: 17 cm')).not.toBeOnTheScreen();

    await user.press(screen.getByRole('tab', { name: 'Settings' }));
    await user.press(await screen.findByRole('link', { name: 'Your measurements' }));
    await user.press(await screen.findByRole('button', { name: 'Bring back the measurement "Wrist"' }));
    expect(await screen.findByRole('button', { name: 'Rename "Wrist"' })).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Back' }));
    await user.press(await screen.findByRole('tab', { name: 'Body' }));
    expect(await screen.findByLabelText('Wrist: 17 cm')).toBeOnTheScreen();
  });

  it('say there is nothing to lose when a part without values is deleted', async () => {
    const { user } = await startApp('/body-parts', (database) => saveBodyPart(database, WRIST, 1));

    await user.press(screen.getByRole('button', { name: 'Delete the measurement "Wrist"' }));

    expect(screen.getByText('Delete "Wrist"? It has no values yet.')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Keep' }));
    expect(screen.getByRole('button', { name: 'Rename "Wrist"' })).toBeOnTheScreen();
  });

  it('do not come back while another part has the name', async () => {
    const { db, user } = await startApp('/body-parts', async (database) => {
      await wrist(database);
      await deleteBodyPart(database, WRIST.id, 2);
      await saveBodyPart(database, { id: 'own:new-wrist', name: 'wrist' }, 3);
    });

    await user.press(screen.getByRole('button', { name: 'Bring back the measurement "Wrist"' }));

    expect(await screen.findByText('There is already a measurement "Wrist". Rename it to bring this one back.')).toBeOnTheScreen();
    expect(await listDeletedBodyParts(db)).toHaveLength(1);
  });

  it('show a name kept from before parts of one’s own existed', async () => {
    // What step 2 of the database makes of a name a backup brought in earlier.
    await startApp('/body', async (database) => {
      await saveBodyPart(database, { id: 'литка ліва', name: 'литка ліва' }, 1);
      await saveBodyMeasurements(database, today, { 'литка ліва': 39.5 }, 1);
    });

    expect(screen.getByLabelText('литка ліва: 39.5 cm')).toBeOnTheScreen();
  });
});
