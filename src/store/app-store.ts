import { create } from 'zustand';

import {
  explainBill,
  explainRevision,
  interpretMessage,
  mergeConstraints,
  NO_CHANGE_REPLY,
  NO_PLAN_REPLY,
  UNKNOWN_REPLY,
} from '@/ai/mock-assistant';
import { calibrate } from '@/optimizer/bill-calibration';
import { samePlanCuts } from '@/optimizer/plan-revision';
import { planStub } from '@/optimizer/stub-planner';
import type { ChatMessage, PlanRevision } from '@/types/chat';
import { NO_CONSTRAINTS, type Appliance, type BillSettings, type Plan, type PlanConstraints, type PlanMode } from '@/types/energy';

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
  /** What the user asked for in chat. Every plan is computed with these applied. */
  constraints: PlanConstraints;
  /** Plan chat history. Lives here so it survives leaving and reopening the screen. */
  chat: ChatMessage[];
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
  /** Adds the user's message and the assistant's (mock) reply, revising the plan when the message asks for it. */
  sendChatMessage: (text: string) => void;
  /** Reverts the plan change made by the latest revision in the chat. */
  undoRevision: (messageId: string) => void;
  /** Clears appliances, bill figures, target and plan. */
  resetAll: () => void;
};

export const useAppStore = create<AppState & AppActions>()((set, get) => ({
  appliances: SAMPLE_APPLIANCES,
  billSettings: SAMPLE_BILL_SETTINGS,
  target: SAMPLE_TARGET,
  planMode: 'fewest-changes',
  plan: null,
  constraints: NO_CONSTRAINTS,
  chat: [],

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
    const { appliances, billSettings, target, planMode, constraints } = get();
    set({ plan: planStub(appliances, billSettings, target, planMode, constraints) });
  },
  sendChatMessage: (text) => {
    const { appliances, billSettings, target, planMode, constraints, plan, chat } = get();
    const sentAt = Date.now();
    const userMessage: ChatMessage = { id: `user-${sentAt}`, role: 'user', text, sentAt };
    const reply = (replyText: string, revision?: PlanRevision): ChatMessage => ({
      id: `assistant-${sentAt}`,
      role: 'assistant',
      text: replyText,
      sentAt,
      revision,
    });

    const interpretation = interpretMessage(text, appliances);

    if (interpretation.kind === 'question') {
      const { ratePerKwh } = calibrate(appliances, billSettings.lastBillTotal, billSettings.lastBillKwh);
      set({ chat: [...chat, userMessage, reply(explainBill(appliances, ratePerKwh))] });
      return;
    }
    if (interpretation.kind === 'unknown') {
      set({ chat: [...chat, userMessage, reply(UNKNOWN_REPLY)] });
      return;
    }
    if (!plan) {
      set({ chat: [...chat, userMessage, reply(NO_PLAN_REPLY)] });
      return;
    }

    const merged = mergeConstraints(constraints, interpretation);
    const next = planStub(appliances, billSettings, target, planMode, merged);
    if (!next || samePlanCuts(plan, next)) {
      set({ constraints: merged, chat: [...chat, userMessage, reply(NO_CHANGE_REPLY)] });
      return;
    }

    const revision: PlanRevision = {
      number: chat.filter((message) => message.role === 'assistant' && message.revision).length + 1,
      plan: next,
      previousPlan: plan,
      constraintsBefore: constraints,
      keptApplianceIds: merged.keep,
    };
    set({
      constraints: merged,
      plan: next,
      chat: [...chat, userMessage, reply(explainRevision(interpretation, next, appliances), revision)],
    });
  },
  undoRevision: (messageId) => {
    const { chat } = get();
    const latest = [...chat].reverse().find((message) => message.role === 'assistant' && message.revision);
    if (!latest || latest.id !== messageId || latest.role !== 'assistant' || !latest.revision) return;

    const sentAt = Date.now();
    set({
      constraints: latest.revision.constraintsBefore,
      chat: [
        ...chat.map((message) => (message.id === messageId ? { ...message, revision: undefined } : message)),
        { id: `assistant-${sentAt}`, role: 'assistant', text: 'Undone. The plan is back to how it was.', sentAt },
      ],
    });
    get().refreshPlan();
  },
  resetAll: () =>
    set({
      appliances: [],
      billSettings: EMPTY_BILL_SETTINGS,
      target: null,
      plan: null,
      constraints: NO_CONSTRAINTS,
      chat: [],
    }),
}));
