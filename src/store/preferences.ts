import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

/**
 * How the person likes the app to look: which Home layout and whether dark mode is on. Kept apart from
 * the household (src/store/persistence.ts) under its own key, so "Reset all data" keeps them and a
 * change to the household's saved format never touches them.
 */

/** The three Home layouts: "Bill at a glance", "Where it goes" and "Bill journey". */
export type HomeLayout = 'glance' | 'breakdown' | 'journey';
export const HOME_LAYOUTS: readonly HomeLayout[] = ['glance', 'breakdown', 'journey'];

export type Preferences = {
  homeLayout: HomeLayout;
  darkMode: boolean;
};

export const DEFAULT_PREFERENCES: Preferences = { homeLayout: 'glance', darkMode: false };

export const PREFERENCES_KEY = 'watt-plan:preferences:v1';

type PreferencesStore = Preferences & {
  setHomeLayout: (homeLayout: HomeLayout) => void;
  setDarkMode: (darkMode: boolean) => void;
};

export const usePreferences = create<PreferencesStore>()((set) => ({
  ...DEFAULT_PREFERENCES,
  setHomeLayout: (homeLayout) => set({ homeLayout }),
  setDarkMode: (darkMode) => set({ darkMode }),
}));

/** Saved text to preferences. Each field falls back to its default on its own, so one bad value never loses the other. */
export function parsePreferences(raw: string | null): Preferences {
  let parsed: unknown;
  try {
    parsed = raw === null ? null : JSON.parse(raw);
  } catch {
    parsed = null;
  }
  const saved = typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  return {
    homeLayout: HOME_LAYOUTS.includes(saved.homeLayout as HomeLayout)
      ? (saved.homeLayout as HomeLayout)
      : DEFAULT_PREFERENCES.homeLayout,
    darkMode: typeof saved.darkMode === 'boolean' ? saved.darkMode : DEFAULT_PREFERENCES.darkMode,
  };
}

export function serializePreferences({ homeLayout, darkMode }: Preferences): string {
  return JSON.stringify({ homeLayout, darkMode });
}

let started: Promise<void> | null = null;

/**
 * Loads the saved preferences, then saves each change right away. Runs once; later calls share the
 * first. Never rejects: unreadable storage leaves the defaults.
 */
export function hydratePreferences(): Promise<void> {
  started ??= AsyncStorage.getItem(PREFERENCES_KEY)
    .catch(() => null)
    .then((raw) => {
      usePreferences.setState(parsePreferences(raw));
      usePreferences.subscribe((state, previous) => {
        if (state.homeLayout === previous.homeLayout && state.darkMode === previous.darkMode) return;
        AsyncStorage.setItem(PREFERENCES_KEY, serializePreferences(state)).catch(() => {
          // Losing one save is harmless: the next change writes everything again.
        });
      });
    });
  return started;
}
