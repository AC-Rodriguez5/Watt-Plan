import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DEFAULT_PREFERENCES,
  hydratePreferences,
  parsePreferences,
  PREFERENCES_KEY,
  serializePreferences,
  usePreferences,
} from '@/store/preferences';

describe('parsePreferences', () => {
  it('reads what serializePreferences writes', () => {
    const saved = { homeLayout: 'journey', darkMode: true } as const;
    expect(parsePreferences(serializePreferences(saved))).toEqual(saved);
  });

  it('falls back to the defaults for nothing saved or unreadable text', () => {
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences('{not json')).toEqual(DEFAULT_PREFERENCES);
  });

  it('keeps a good field when the other one is bad', () => {
    expect(parsePreferences(JSON.stringify({ homeLayout: 'sideways', darkMode: true }))).toEqual({
      homeLayout: 'glance',
      darkMode: true,
    });
    expect(parsePreferences(JSON.stringify({ homeLayout: 'breakdown', darkMode: 'yes' }))).toEqual({
      homeLayout: 'breakdown',
      darkMode: false,
    });
  });
});

describe('hydratePreferences', () => {
  it('loads the saved choice, then saves each change', async () => {
    await AsyncStorage.setItem(PREFERENCES_KEY, serializePreferences({ homeLayout: 'breakdown', darkMode: true }));
    await hydratePreferences();
    expect(usePreferences.getState()).toMatchObject({ homeLayout: 'breakdown', darkMode: true });

    usePreferences.getState().setDarkMode(false);
    usePreferences.getState().setHomeLayout('journey');
    await Promise.resolve();
    expect(parsePreferences(await AsyncStorage.getItem(PREFERENCES_KEY))).toEqual({ homeLayout: 'journey', darkMode: false });
  });
});
