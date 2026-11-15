import { create } from 'zustand';

import { planStub } from '@/optimizer/stub-planner';
import type { Appliance, BillSettings, Plan, PlanMode } from '@/types/energy';

import { EMPTY_BILL_SETTINGS, SAMPLE_APPLIANCES, SAMPLE_BILL_SETTINGS, SAMPLE_TARGET } from './sample-household';

/**
 * The one shared store. The Plan screen and Plan chat both read `plan`, so they
 * always show the same plan. The store only holds data; money and kWh math
 * lives in src/optimizer.
 */
type AppState = {
  appliances: Appliance[];
  billSettings: BillSettings;
  /** Monthly bill target in pesos. Null until the user sets one. */
  target: number | null;
  /** Strategy the next plan is computed with. */
  planMode: PlanMode;
  /** Latest optimizer result. Null until a plan has been computed. */
  plan: Plan | null;
};

type AppActions = {
  addAppliance: (appliance: Omit<Appliance, 'id'>) => void;
  updateAppliance: (id: string, changes: Partial<Omit<Appliance, 'id'>>) => void;
  removeAppliance: (id: string) => void;
  updateBillSettings: (changes: Partial<BillSettings>) => void;
  setTarget: (target: number | null) => void;
  setPlanMode: (mode: PlanMode) => void;
  setPlan: (plan: Plan | null) => void;
  /** Recomputes `plan` from the current appliances, bill, target and mode. */
  refreshPlan: () => void;
  /** Clears appliances, bill figures, target and plan. */
  resetAll: () => void;
};

export const useAppStore = create<AppState & AppActions>()((set, get) => ({
  appliances: SAMPLE_APPLIANCES,
  billSettings: SAMPLE_BILL_SETTINGS,
  target: SAMPLE_TARGET,
  planMode: 'fewest-changes',
  plan: null,

  addAppliance: (appliance) =>
    set((state) => ({
      appliances: [...state.appliances, { ...appliance, id: `appliance-${Date.now()}` }],
    })),
  updateAppliance: (id, changes) =>
    set((state) => ({
      appliances: state.appliances.map((a) => (a.id === id ? { ...a, ...changes } : a)),
    })),
  removeAppliance: (id) => set((state) => ({ appliances: state.appliances.filter((a) => a.id !== id) })),
  updateBillSettings: (changes) => set((state) => ({ billSettings: { ...state.billSettings, ...changes } })),
  setTarget: (target) => set({ target }),
  setPlanMode: (planMode) => set({ planMode }),
  setPlan: (plan) => set({ plan }),
  refreshPlan: () => {
    const { appliances, billSettings, target, planMode } = get();
    set({ plan: planStub(appliances, billSettings, target, planMode) });
  },
  resetAll: () => set({ appliances: [], billSettings: EMPTY_BILL_SETTINGS, target: null, plan: null }),
}));
