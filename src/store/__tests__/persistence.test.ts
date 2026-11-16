/* eslint-disable @typescript-eslint/no-require-imports -- jest.resetModules() needs require() to get fresh modules */
import type { PersistedState } from '../persistence';

/** Fresh copies of the store, persistence and AsyncStorage mock, so each test starts unloaded. */
function load() {
  jest.resetModules();
  const storage = require('@react-native-async-storage/async-storage') as typeof import('@react-native-async-storage/async-storage').default;
  const persistence = require('../persistence') as typeof import('../persistence');
  const { useAppStore } = require('../app-store') as typeof import('../app-store');
  const { hydrateStore } = require('../hydrate') as typeof import('../hydrate');
  const sample = require('../sample-household') as typeof import('../sample-household');
  return { storage, persistence, useAppStore, hydrateStore, sample };
}

const SAVED: PersistedState = {
  appliances: [
    { id: 'kettle', name: 'Kettle', category: 'flexible', watts: 1500, hoursPerDay: 1, daysPerWeek: 7, minHoursPerDay: 0.5, note: 'Kitchen' },
  ],
  billSettings: {
    utility: 'Meralco Residential',
    periodStart: '2025-01-01',
    periodEnd: '2025-01-31',
    lastBillTotal: 1800,
    lastBillKwh: 150,
    generationCharge: null,
    distributionCharge: null,
    taxesCharge: null,
  },
  // Deliberately not what the kettle and bill would give (150 / 45.465 = 3.299...): a reload must keep this stored value.
  calibrationFactor: 2.5,
  target: 1500,
  planMode: 'comfort-first',
};

/** What the kettle household's factor is when computed from its appliances and bill. */
const KETTLE_FACTOR = 150 / ((1500 * 1 * 7 * 4.33) / 1000);

/** The saved fields as they were written before the factor was stored. */
const { calibrationFactor: _stored, ...LEGACY } = SAVED;

const envelope = (state: unknown) => JSON.stringify({ version: 1, state });

describe('storage key', () => {
  it('carries the format version', () => {
    const { persistence } = load();
    expect(persistence.STORAGE_KEY).toBe(`watt-plan:household:v${persistence.STORAGE_VERSION}`);
  });
});

describe('parsePersistedState', () => {
  it('round-trips what serializePersistedState wrote', () => {
    const { persistence } = load();
    const raw = persistence.serializePersistedState(SAVED);
    expect(persistence.parsePersistedState(raw)).toEqual(SAVED);
  });

  it('accepts an empty appliance list and a null target', () => {
    const { persistence } = load();
    const state = { ...SAVED, appliances: [], target: null };
    expect(persistence.parsePersistedState(persistence.serializePersistedState(state))).toEqual(state);
  });

  it('keeps the stored factor', () => {
    const { persistence } = load();
    expect(persistence.parsePersistedState(persistence.serializePersistedState(SAVED))?.calibrationFactor).toBe(2.5);
  });

  it('computes the factor once for data saved without one', () => {
    const { persistence } = load();
    const parsed = persistence.parsePersistedState(envelope(LEGACY));
    expect(parsed).toEqual({ ...LEGACY, calibrationFactor: expect.any(Number) });
    expect(parsed?.calibrationFactor).toBeCloseTo(KETTLE_FACTOR, 9);
  });

  it('uses a factor of 1 for data saved without one and without a bill', () => {
    const { persistence } = load();
    const noBill = { ...LEGACY.billSettings, lastBillTotal: null, lastBillKwh: null };
    expect(persistence.parsePersistedState(envelope({ ...LEGACY, billSettings: noBill }))?.calibrationFactor).toBe(1);
  });

  it('keeps the same storage version, so old saved data is still read', () => {
    const { persistence } = load();
    expect(persistence.STORAGE_VERSION).toBe(1);
  });

  it.each([
    ['nothing stored', null],
    ['text that is not JSON', '{"version":1,'],
    ['JSON that is not an object', '[1,2,3]'],
    ['an empty string', ''],
    ['another format version', JSON.stringify({ version: 2, state: SAVED })],
    ['no version', JSON.stringify({ state: SAVED })],
    ['no state', JSON.stringify({ version: 1 })],
    ['appliances that are not a list', envelope({ ...SAVED, appliances: 'none' })],
    ['an appliance with a bad category', envelope({ ...SAVED, appliances: [{ ...SAVED.appliances[0], category: 'fancy' }] })],
    ['an appliance with negative watts', envelope({ ...SAVED, appliances: [{ ...SAVED.appliances[0], watts: -5 }] })],
    ['an appliance missing its name', envelope({ ...SAVED, appliances: [{ ...SAVED.appliances[0], name: undefined }] })],
    ['bill settings with a text amount', envelope({ ...SAVED, billSettings: { ...SAVED.billSettings, lastBillTotal: '1800' } })],
    ['no bill settings', envelope({ ...SAVED, billSettings: null })],
    ['a target that is not a number', envelope({ ...SAVED, target: 'high' })],
    ['an unknown strategy', envelope({ ...SAVED, planMode: 'cheapest' })],
    ['a factor that is text', envelope({ ...SAVED, calibrationFactor: '2.5' })],
    ['a factor of zero', envelope({ ...SAVED, calibrationFactor: 0 })],
    ['a negative factor', envelope({ ...SAVED, calibrationFactor: -1 })],
    ['a factor that is null', envelope({ ...SAVED, calibrationFactor: null })],
  ])('returns null for %s', (_label, raw) => {
    const { persistence } = load();
    expect(persistence.parsePersistedState(raw)).toBeNull();
  });
});

describe('loadPersistedState', () => {
  it('returns null when nothing is saved', async () => {
    const { persistence } = load();
    await expect(persistence.loadPersistedState()).resolves.toBeNull();
  });

  it('returns the saved state', async () => {
    const { persistence, storage } = load();
    await storage.setItem(persistence.STORAGE_KEY, persistence.serializePersistedState(SAVED));
    await expect(persistence.loadPersistedState()).resolves.toEqual(SAVED);
  });

  it('returns null for corrupted data and removes it', async () => {
    const { persistence, storage } = load();
    await storage.setItem(persistence.STORAGE_KEY, '{not json');
    await expect(persistence.loadPersistedState()).resolves.toBeNull();
    await expect(storage.getItem(persistence.STORAGE_KEY)).resolves.toBeNull();
  });

  it('does not touch data saved under another version key', async () => {
    const { persistence, storage } = load();
    await storage.setItem('watt-plan:household:v0', 'old format');
    await expect(persistence.loadPersistedState()).resolves.toBeNull();
    await expect(storage.getItem('watt-plan:household:v0')).resolves.toBe('old format');
  });

  it('returns null instead of throwing when storage fails', async () => {
    const { persistence, storage } = load();
    (storage.getItem as jest.Mock).mockRejectedValueOnce(new Error('disk error'));
    await expect(persistence.loadPersistedState()).resolves.toBeNull();
  });
});

describe('savePersistedState', () => {
  it('writes the versioned envelope under the versioned key', async () => {
    const { persistence, storage } = load();
    await persistence.savePersistedState(SAVED);
    const raw = await storage.getItem(persistence.STORAGE_KEY);
    expect(JSON.parse(raw as string)).toEqual({ version: persistence.STORAGE_VERSION, state: SAVED });
  });

  it('does not throw when storage fails', async () => {
    const { persistence, storage } = load();
    (storage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk full'));
    await expect(persistence.savePersistedState(SAVED)).resolves.toBeUndefined();
  });
});

describe('hydrateStore', () => {
  it('restores the saved household before saving starts', async () => {
    const { persistence, storage, useAppStore, hydrateStore } = load();
    await storage.setItem(persistence.STORAGE_KEY, persistence.serializePersistedState(SAVED));
    (storage.setItem as jest.Mock).mockClear();

    await hydrateStore();

    const state = useAppStore.getState();
    expect(state.appliances).toEqual(SAVED.appliances);
    expect(state.billSettings).toEqual(SAVED.billSettings);
    expect(state.target).toBe(1500);
    expect(state.planMode).toBe('comfort-first');
    expect(state.calibrationFactor).toBe(2.5);
    expect(state.baseline.calibrationFactor).toBe(2.5);
    expect(state.plan?.target).toBe(1500);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('computes the factor once on load for old saved data that has none', async () => {
    const { persistence, storage, useAppStore, hydrateStore } = load();
    await storage.setItem(persistence.STORAGE_KEY, envelope(LEGACY));
    (storage.setItem as jest.Mock).mockClear();

    await hydrateStore();

    const state = useAppStore.getState();
    expect(state.calibrationFactor).toBeCloseTo(KETTLE_FACTOR, 9);
    expect(state.baseline.cost).toBeCloseTo(1800, 6);
    expect(state.plan).not.toBeNull();
  });

  it('keeps the sample household when nothing is saved', async () => {
    const { useAppStore, hydrateStore, sample } = load();
    await hydrateStore();
    const state = useAppStore.getState();
    expect(state.appliances).toEqual(sample.SAMPLE_APPLIANCES);
    expect(state.billSettings).toEqual(sample.SAMPLE_BILL_SETTINGS);
    expect(state.target).toBe(sample.SAMPLE_TARGET);
    expect(state.calibrationFactor).toBe(sample.SAMPLE_CALIBRATION_FACTOR);
  });

  it('falls back to the sample household on corrupted data without crashing', async () => {
    const { persistence, storage, useAppStore, hydrateStore, sample } = load();
    await storage.setItem(persistence.STORAGE_KEY, envelope({ appliances: 'oops' }));
    await expect(hydrateStore()).resolves.toBeUndefined();
    expect(useAppStore.getState().appliances).toEqual(sample.SAMPLE_APPLIANCES);
    expect(useAppStore.getState().plan).not.toBeNull();
  });
});

describe('saving changes', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('saves once after a burst of changes, with the latest values', async () => {
    const { persistence, storage, useAppStore, hydrateStore } = load();
    await hydrateStore();
    (storage.setItem as jest.Mock).mockClear();

    useAppStore.getState().setTarget(2500);
    useAppStore.getState().setTarget(2600);
    useAppStore.getState().setPlanMode('comfort-first');
    expect(storage.setItem).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(persistence.SAVE_DEBOUNCE_MS);

    expect(storage.setItem).toHaveBeenCalledTimes(1);
    const saved = persistence.parsePersistedState(await storage.getItem(persistence.STORAGE_KEY));
    expect(saved?.target).toBe(2600);
    expect(saved?.planMode).toBe('comfort-first');
  });

  it('saves appliance and bill setting changes', async () => {
    const { persistence, storage, useAppStore, hydrateStore } = load();
    await hydrateStore();

    useAppStore.getState().updateAppliance('aircon', { hoursPerDay: 3 });
    useAppStore.getState().updateBillSettings({ lastBillTotal: 4100 });
    await jest.advanceTimersByTimeAsync(persistence.SAVE_DEBOUNCE_MS);

    const saved = persistence.parsePersistedState(await storage.getItem(persistence.STORAGE_KEY));
    expect(saved?.appliances.find(({ id }) => id === 'aircon')?.hoursPerDay).toBe(3);
    expect(saved?.billSettings.lastBillTotal).toBe(4100);
  });

  it('saves the factor when bill settings are saved again', async () => {
    const { persistence, storage, useAppStore, hydrateStore, sample } = load();
    await hydrateStore();
    useAppStore.getState().addAppliance({ name: 'Heater', category: 'luxury', watts: 3000, hoursPerDay: 2, daysPerWeek: 7 });
    useAppStore.getState().updateBillSettings({ lastBillTotal: 3400, lastBillKwh: 283 });
    await jest.advanceTimersByTimeAsync(persistence.SAVE_DEBOUNCE_MS);

    const saved = persistence.parsePersistedState(await storage.getItem(persistence.STORAGE_KEY));
    expect(saved?.calibrationFactor).toBe(useAppStore.getState().calibrationFactor);
    expect(saved?.calibrationFactor).toBeLessThan(sample.SAMPLE_CALIBRATION_FACTOR);
  });

  it('does not save changes to anything that is not saved state', async () => {
    const { persistence, storage, useAppStore, hydrateStore } = load();
    await hydrateStore();
    useAppStore.getState().setAssistantStatus('thinking');
    useAppStore.setState({ chat: [{ id: 'user-1', role: 'user', text: 'hello', sentAt: 1 }] });
    await jest.advanceTimersByTimeAsync(persistence.SAVE_DEBOUNCE_MS * 2);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('flushPersistedState writes a waiting change immediately', async () => {
    const { persistence, storage, useAppStore, hydrateStore } = load();
    await hydrateStore();
    useAppStore.getState().setTarget(1900);
    await persistence.flushPersistedState();
    const saved = persistence.parsePersistedState(await storage.getItem(persistence.STORAGE_KEY));
    expect(saved?.target).toBe(1900);
    await jest.advanceTimersByTimeAsync(persistence.SAVE_DEBOUNCE_MS * 2);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });

  it('restores what was saved on the next launch', async () => {
    const first = load();
    await first.hydrateStore();
    first.useAppStore.getState().setTarget(1750);
    await first.persistence.flushPersistedState();
    const stored = await first.storage.getItem(first.persistence.STORAGE_KEY);

    const second = load();
    await second.storage.setItem(second.persistence.STORAGE_KEY, stored as string);
    await second.hydrateStore();
    expect(second.useAppStore.getState().target).toBe(1750);
  });

  it('keeps the stored factor across a reload instead of recomputing it', async () => {
    const first = load();
    await first.hydrateStore();
    // Adding an appliance leaves the factor alone, so the saved factor no longer matches the saved appliances.
    first.useAppStore.getState().addAppliance({ name: 'Heater', category: 'luxury', watts: 3000, hoursPerDay: 2, daysPerWeek: 7 });
    await first.persistence.flushPersistedState();
    const before = first.useAppStore.getState();
    const stored = await first.storage.getItem(first.persistence.STORAGE_KEY);
    const { computeCalibrationFactor } = require('@/optimizer/bill-calibration') as typeof import('@/optimizer/bill-calibration');
    expect(computeCalibrationFactor(before.appliances, 3400, 283)).not.toBeCloseTo(before.calibrationFactor, 3);

    const second = load();
    await second.storage.setItem(second.persistence.STORAGE_KEY, stored as string);
    await second.hydrateStore();

    const after = second.useAppStore.getState();
    expect(after.calibrationFactor).toBe(first.sample.SAMPLE_CALIBRATION_FACTOR);
    expect(after.calibrationFactor).toBe(before.calibrationFactor);
    expect(after.appliances).toHaveLength(first.sample.SAMPLE_APPLIANCES.length + 1);
    expect(after.baseline.cost).toBeCloseTo(before.baseline.cost, 9);
    expect(after.baseline.cost).toBeGreaterThan(3400 + 1);
    expect(after.plan?.currentEstimate).toBeCloseTo(before.plan!.currentEstimate, 9);
  });
});

describe('resetAll', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('restores the sample household and clears storage', async () => {
    const { persistence, storage, useAppStore, hydrateStore, sample } = load();
    await storage.setItem(persistence.STORAGE_KEY, persistence.serializePersistedState(SAVED));
    await hydrateStore();
    expect(useAppStore.getState().target).toBe(1500);

    useAppStore.getState().resetAll();
    await jest.advanceTimersByTimeAsync(persistence.SAVE_DEBOUNCE_MS * 2);

    const state = useAppStore.getState();
    expect(state.appliances).toEqual(sample.SAMPLE_APPLIANCES);
    expect(state.billSettings).toEqual(sample.SAMPLE_BILL_SETTINGS);
    expect(state.target).toBe(sample.SAMPLE_TARGET);
    expect(state.planMode).toBe('fewest-changes');
    expect(state.calibrationFactor).toBe(sample.SAMPLE_CALIBRATION_FACTOR);
    expect(state.baseline.cost).toBeCloseTo(3400, 6);
    expect(state.plan).not.toBeNull();
    await expect(storage.getItem(persistence.STORAGE_KEY)).resolves.toBeNull();
  });

  it('cancels a save that was still waiting', async () => {
    const { persistence, storage, useAppStore, hydrateStore } = load();
    await hydrateStore();
    useAppStore.getState().setTarget(3000);
    useAppStore.getState().resetAll();
    await jest.advanceTimersByTimeAsync(persistence.SAVE_DEBOUNCE_MS * 2);
    await expect(storage.getItem(persistence.STORAGE_KEY)).resolves.toBeNull();
  });

  it('starts saving again after a reset', async () => {
    const { persistence, storage, useAppStore, hydrateStore } = load();
    await hydrateStore();
    useAppStore.getState().resetAll();
    useAppStore.getState().setTarget(2200);
    await jest.advanceTimersByTimeAsync(persistence.SAVE_DEBOUNCE_MS);
    const saved = persistence.parsePersistedState(await storage.getItem(persistence.STORAGE_KEY));
    expect(saved?.target).toBe(2200);
  });
});
