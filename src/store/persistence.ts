import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Appliance, ApplianceCategory, BillSettings, PlanMode } from '@/types/energy';

/**
 * Saves the user's household (appliances, bill settings, target, strategy) so the app restores it on
 * launch. Everything derived from it (plan, baseline) is recomputed, and chat is not saved.
 *
 * The key carries the format version. A future format change bumps it, so old data is never read as
 * the new shape: the new version simply finds nothing under its own key and starts from the sample.
 */
export const STORAGE_VERSION = 1;
export const STORAGE_KEY = `watt-plan:household:v${STORAGE_VERSION}`;

/** How long after the last change the save happens, so a burst of edits is written once. */
export const SAVE_DEBOUNCE_MS = 400;

export type PersistedState = {
  appliances: Appliance[];
  billSettings: BillSettings;
  target: number | null;
  planMode: PlanMode;
};

type Envelope = { version: number; state: PersistedState };

const CATEGORIES: readonly ApplianceCategory[] = ['essential', 'flexible', 'luxury'];
const PLAN_MODES: readonly PlanMode[] = ['fewest-changes', 'comfort-first'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isAmount = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

const isAmountOrNull = (value: unknown): value is number | null => value === null || isAmount(value);

const isOptional = <T>(value: unknown, check: (v: unknown) => v is T): boolean => value === undefined || check(value);

const isString = (value: unknown): value is string => typeof value === 'string';

function isAppliance(value: unknown): value is Appliance {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.name) &&
    CATEGORIES.includes(value.category as ApplianceCategory) &&
    isAmount(value.watts) &&
    isAmount(value.hoursPerDay) &&
    isAmount(value.daysPerWeek) &&
    isOptional(value.minHoursPerDay, isAmount) &&
    isOptional(value.note, isString)
  );
}

function isBillSettings(value: unknown): value is BillSettings {
  return (
    isRecord(value) &&
    isString(value.utility) &&
    isString(value.periodStart) &&
    isString(value.periodEnd) &&
    isAmountOrNull(value.lastBillTotal) &&
    isAmountOrNull(value.lastBillKwh) &&
    isAmountOrNull(value.generationCharge) &&
    isAmountOrNull(value.distributionCharge) &&
    isAmountOrNull(value.taxesCharge)
  );
}

/**
 * Turns the stored text into saved state, or null when it is not usable: not JSON, from another
 * format version, or any field missing or of the wrong type. All or nothing, so a half-readable
 * household never mixes with the sample.
 */
export function parsePersistedState(raw: string | null): PersistedState | null {
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || parsed.version !== STORAGE_VERSION || !isRecord(parsed.state)) return null;

  const { appliances, billSettings, target, planMode } = parsed.state;
  if (
    !Array.isArray(appliances) ||
    !appliances.every(isAppliance) ||
    !isBillSettings(billSettings) ||
    !isAmountOrNull(target) ||
    !PLAN_MODES.includes(planMode as PlanMode)
  ) {
    return null;
  }
  return { appliances, billSettings, target, planMode: planMode as PlanMode };
}

export function serializePersistedState(state: PersistedState): string {
  const envelope: Envelope = {
    version: STORAGE_VERSION,
    state: {
      appliances: state.appliances,
      billSettings: state.billSettings,
      target: state.target,
      planMode: state.planMode,
    },
  };
  return JSON.stringify(envelope);
}

/**
 * Reads the saved household. Resolves null when nothing is saved, the data is corrupted or storage
 * itself fails, and the caller then keeps the sample household. Corrupted data is dropped so it is
 * not parsed again on every launch.
 */
export async function loadPersistedState(): Promise<PersistedState | null> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  const state = parsePersistedState(raw);
  if (state === null && raw !== null) {
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }
  return state;
}

export async function savePersistedState(state: PersistedState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, serializePersistedState(state));
  } catch {
    // Losing a save must never crash the app; the next change tries again.
  }
}

let pending: { timer: ReturnType<typeof setTimeout>; state: PersistedState } | null = null;

function writePending(): Promise<void> {
  if (!pending) return Promise.resolve();
  const { timer, state } = pending;
  clearTimeout(timer);
  pending = null;
  return savePersistedState(state);
}

/** Saves right away whatever change is still waiting out its debounce. */
export function flushPersistedState(): Promise<void> {
  return writePending();
}

/** Drops any save still waiting, then erases what is stored. Used by "Reset all data". */
export async function clearPersistedState(): Promise<void> {
  if (pending) {
    clearTimeout(pending.timer);
    pending = null;
  }
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing more to do; the stale data is replaced by the next save.
  }
}

/**
 * Saves whenever one of the four saved fields changes, after SAVE_DEBOUNCE_MS without another
 * change. Returns a function that stops listening (a save already waiting still happens). Start it after loading, so the load itself is not
 * written straight back.
 */
export function startPersisting<S extends PersistedState>(
  store: { subscribe: (listener: (state: S, previous: S) => void) => () => void },
  debounceMs: number = SAVE_DEBOUNCE_MS,
): () => void {
  const unsubscribe = store.subscribe((state, previous) => {
    if (
      state.appliances === previous.appliances &&
      state.billSettings === previous.billSettings &&
      state.target === previous.target &&
      state.planMode === previous.planMode
    ) {
      return;
    }
    if (pending) clearTimeout(pending.timer);
    const snapshot: PersistedState = {
      appliances: state.appliances,
      billSettings: state.billSettings,
      target: state.target,
      planMode: state.planMode,
    };
    pending = { timer: setTimeout(writePending, debounceMs), state: snapshot };
  });
  return unsubscribe;
}
