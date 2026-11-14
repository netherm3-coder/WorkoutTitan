import AsyncStorage from '@react-native-async-storage/async-storage';
import { userEvent } from '@testing-library/react-native';
import { getLocales } from 'expo-localization';
import { renderRouter, screen } from 'expo-router/testing-library';

jest.mock('expo-localization', () => ({ getLocales: jest.fn() }));

/** Only the two fields the app reads; the real locale object has a dozen more. */
const deviceLocale = (languageCode: string, regionCode: string) => {
  const locales = [{ languageCode, regionCode }] as unknown as ReturnType<typeof getLocales>;
  jest.mocked(getLocales).mockReturnValue(locales);
};

/** Renders the real routes from `src/app`, the way the app starts on a phone. */
const startApp = (initialUrl = '/') => renderRouter('src/app', { initialUrl });

const tab = (name: string) => screen.getByRole('tab', { name });
const option = (name: string | RegExp) => screen.getByRole('radio', { name });

beforeEach(async () => {
  await AsyncStorage.clear();
  deviceLocale('en', 'US');
});

describe('first launch', () => {
  it('opens Home in English on an English phone', async () => {
    const app = await startApp();

    expect(await screen.findByRole('header', { name: 'Room of Records' })).toBeOnTheScreen();
    expect(screen.getByText('No records yet')).toBeOnTheScreen();
    expect(screen.getByRole('image', { name: 'A knight resting by the campfire at camp' })).toBeOnTheScreen();
    expect(app.getPathname()).toBe('/');
  });

  it('opens Home in Ukrainian on a Ukrainian phone', async () => {
    deviceLocale('uk', 'UA');
    await startApp();

    expect(await screen.findByRole('header', { name: 'Кімната рекордів' })).toBeOnTheScreen();
    expect(screen.getByText('Рекордів ще немає')).toBeOnTheScreen();
  });
});

describe('tabs', () => {
  it('lists the five sections and marks the open one', async () => {
    await startApp();
    await screen.findByRole('header', { name: 'Room of Records' });

    expect(screen.getAllByRole('tab').map((item) => item.props.accessibilityLabel)).toEqual([
      'Home',
      'Workouts',
      'Body',
      'Awards',
      'Settings',
    ]);
    expect(tab('Home')).toBeSelected();
    expect(tab('Settings')).not.toBeSelected();
  });

  it.each([
    ['Workouts', '/workouts', 'The log is empty'],
    ['Body', '/body', 'No measurements yet.'],
    ['Awards', '/achievements', 'Points: 0 of 2170'],
    ['Settings', '/settings', 'Language'],
  ])('opens %s', async (name, pathname, content) => {
    const user = userEvent.setup();
    const app = await startApp();
    await screen.findByRole('header', { name: 'Room of Records' });

    await user.press(tab(name));

    expect(await screen.findByText(content)).toBeOnTheScreen();
    expect(app.getPathname()).toBe(pathname);
    expect(tab(name)).toBeSelected();
  });
});

describe('language', () => {
  it('switches every string at once and is remembered', async () => {
    const user = userEvent.setup();
    await startApp('/settings');
    expect(await screen.findByRole('header', { name: 'Settings' })).toBeOnTheScreen();
    expect(option('English')).toBeChecked();

    await user.press(option('Українська'));

    expect(await screen.findByRole('header', { name: 'Налаштування' })).toBeOnTheScreen();
    expect(option('Українська')).toBeChecked();
    expect(option('English')).not.toBeChecked();
    // The tab bar is translated too, not only the open screen.
    expect(tab('Головна')).toBeOnTheScreen();
    expect(await AsyncStorage.getItem('record.settings.language')).toBe('uk');
  });

  it('starts in the saved language, whatever the phone is set to', async () => {
    await AsyncStorage.setItem('record.settings.language', 'uk');
    await startApp('/settings');

    expect(await screen.findByRole('header', { name: 'Налаштування' })).toBeOnTheScreen();
  });
});

describe('skins', () => {
  it('starts with the camp skin', async () => {
    await startApp('/settings');
    await screen.findByRole('header', { name: 'Settings' });

    expect(option(/^Camp/)).toBeChecked();
    expect(option(/^Night/)).not.toBeChecked();
    expect(option(/^Day/)).not.toBeChecked();
  });

  it('switches skin at once and is remembered', async () => {
    const user = userEvent.setup();
    await startApp('/settings');
    const title = await screen.findByRole('header', { name: 'Settings' });
    expect(title).toHaveStyle({ fontFamily: 'ShantellSans_700Bold', color: '#fff7f2' });

    await user.press(option(/^Day/));

    expect(option(/^Day/)).toBeChecked();
    expect(option(/^Camp/)).not.toBeChecked();
    expect(screen.getByRole('header', { name: 'Settings' })).toHaveStyle({
      fontFamily: 'Nunito_800ExtraBold',
      color: '#0f172a',
    });
    expect(await AsyncStorage.getItem('record.settings.themeId')).toBe('day');
  });

  it('starts with the saved skin', async () => {
    await AsyncStorage.setItem('record.settings.themeId', 'night');
    await startApp('/settings');
    await screen.findByRole('header', { name: 'Settings' });

    expect(option(/^Night/)).toBeChecked();
  });
});

describe('support screen', () => {
  it('opens from Settings and goes back', async () => {
    const user = userEvent.setup();
    const app = await startApp('/settings');
    await screen.findByRole('header', { name: 'Settings' });

    await user.press(screen.getByRole('link', { name: 'Support the author' }));

    expect(await screen.findByText(/Record is free and has no ads/)).toBeOnTheScreen();
    expect(app.getPathname()).toBe('/support');

    await user.press(screen.getByRole('button', { name: 'Back' }));

    expect(app.getPathname()).toBe('/settings');
  });
});

describe('unknown link', () => {
  it('explains and offers the way home', async () => {
    const user = userEvent.setup();
    const app = await startApp('/no-such-screen');

    expect(await screen.findByRole('header', { name: 'This screen does not exist' })).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Go to Home' }));

    expect(await screen.findByRole('header', { name: 'Room of Records' })).toBeOnTheScreen();
    expect(app.getPathname()).toBe('/');
  });
});
