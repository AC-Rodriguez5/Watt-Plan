import { AppState } from 'react-native';

import { useAppStore } from './app-store';
import { flushPersistedState, loadPersistedState, startPersisting } from './persistence';

let started: Promise<void> | null = null;

/**
 * Loads the saved household into the store, then starts saving changes. Runs once; later calls share
 * the first. Never rejects: missing, corrupted or unreadable data leaves the sample household in
 * place. Saving starts only after the load, so the loaded data is not written straight back.
 */
export function hydrateStore(): Promise<void> {
  started ??= loadPersistedState().then((saved) => {
    if (saved) {
      try {
        useAppStore.getState().hydrate(saved);
      } catch {
        // Well-formed but unusable data: keep the sample household.
      }
    }
    startPersisting(useAppStore);
    // A change still waiting out its debounce would be lost if Android kills the app in the background.
    AppState.addEventListener('change', (state) => {
      if (state !== 'active') void flushPersistedState();
    });
  });
  return started;
}
