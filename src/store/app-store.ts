import { create } from 'zustand';

import { explainPlanChange, answerFromPlan } from '@/ai/explain';
import { interpretMessage } from '@/ai/interpret';
import { DIDNT_CATCH_REPLY, NO_CHANGE_REPLY, NO_PLAN_REPLY } from '@/ai/templates';
import { actionTargetsExist, applyAction, inputsBefore, isPlanChange, restoreInputs } from '@/optimizer/apply-action';
import { computePlan } from '@/optimizer/compute-plan';
import { computeCalibrationFactor } from '@/optimizer/bill-calibration';
import { buildBaseline, type Baseline } from '@/optimizer/optimizer';
import { planChanged } from '@/optimizer/plan-revision';
import type { AssistantStatus, ChatMessage, PlanRevision } from '@/types/chat';
import { NO_CONSTRAINTS, type Appliance, type BillSettings, type Plan, type PlanConstraints, type PlanMode } from '@/types/energy';

import { clearPersistedState, type PersistedState } from './persistence';
import { SAMPLE_APPLIANCES, SAMPLE_BILL_SETTINGS, SAMPLE_CALIBRATION_FACTOR, SAMPLE_TARGET } from './sample-household';

/**
 * The one shared store. Home, the Plan screen and Plan chat all read `plan` and `baseline`, so they
 * always show the same numbers. Both are recomputed here whenever the appliances, bill settings,
 * target or strategy change (see the subscription below the store). The store only holds data;
 * money and kWh math lives in src/optimizer.
 */
type AppState = {
  appliances: Appliance[];
  billSettings: BillSettings;
  /**
   * Billed kWh / summed appliance kWh, computed once when the bill settings are saved (and for the
   * sample household) and reused until the next save. Appliance edits do not touch it, so they move
   * the baseline, Home and the plan instead of being scaled back to the last bill. 1 without a bill.
   */
  calibrationFactor: number;
  /** Monthly bill target in pesos. Null until the user sets one. */
  target: number | null;
  /** Strategy the next plan is computed with. */
  planMode: PlanMode;
  /** Latest optimizer result. Null while there is no target or no appliances. */
  plan: Plan | null;
  /** The household's calibrated monthly kWh and cost per appliance. Home's figures come from it. */
  baseline: Baseline;
  /** What the user asked for in chat. Every plan is computed with these applied. */
  constraints: PlanConstraints;
  /** Plan chat history. Lives here so it survives leaving and reopening the screen. */
  chat: ChatMessage[];
  /** Whether the assistant can answer right now. Plan chat draws the loading and offline replies from it. */
  assistantStatus: AssistantStatus;
};

type AppActions = {
  addAppliance: (appliance: Omit<Appliance, 'id'>) => void;
  updateAppliance: (id: string, changes: Partial<Omit<Appliance, 'id'>>) => void;
  removeAppliance: (id: string) => void;
  /** Saves bill settings and recalibrates: the factor is recomputed from the current appliances. */
  updateBillSettings: (changes: Partial<BillSettings>) => void;
  setTarget: (target: number | null) => void;
  setPlanMode: (mode: PlanMode) => void;
  setPlan: (plan: Plan | null) => void;
  /** Recomputes `plan` and `baseline` from the current appliances, bill, target, mode and constraints. */
  refreshPlan: () => void;
  /**
   * Adds the user's message, then runs the AI pipeline: interpret, apply to the plan, explain. The
   * assistant's reply (with the receipt, when the plan changed) is added when it finishes.
   */
  sendChatMessage: (text: string) => Promise<void>;
  /** Runs the pipeline again for the latest user message, when the assistant could not be reached for it. */
  retryLastMessage: () => Promise<void>;
  /** Reverts the plan change made by the latest revision in the chat. */
  undoRevision: (messageId: string) => void;
  /** Sets whether the assistant is ready, thinking or unreachable. */
  setAssistantStatus: (status: AssistantStatus) => void;
  /** Replaces the household with saved data loaded at launch. */
  hydrate: (saved: PersistedState) => void;
  /** Restores the sample household and erases the saved copy. */
  resetAll: () => void;
};

/** Everything derived from the household: the baseline and the plan, computed by src/optimizer. */
function derive({
  appliances,
  billSettings,
  calibrationFactor,
  target,
  planMode,
  constraints,
}: Pick<AppState, 'appliances' | 'billSettings' | 'calibrationFactor' | 'target' | 'planMode' | 'constraints'>): Pick<
  AppState,
  'plan' | 'baseline'
> {
  return {
    baseline: buildBaseline(appliances, billSettings, calibrationFactor),
    plan: computePlan(appliances, billSettings, calibrationFactor, target, planMode, constraints),
  };
}

const INITIAL_INPUTS = {
  appliances: SAMPLE_APPLIANCES,
  billSettings: SAMPLE_BILL_SETTINGS,
  calibrationFactor: SAMPLE_CALIBRATION_FACTOR,
  target: SAMPLE_TARGET as number | null,
  planMode: 'fewest-changes' as PlanMode,
  constraints: NO_CONSTRAINTS,
};

export const useAppStore = create<AppState & AppActions>()((set, get) => ({
  ...INITIAL_INPUTS,
  ...derive(INITIAL_INPUTS),
  chat: [],
  assistantStatus: 'ready',

  addAppliance: (appliance) =>
    set((state) => ({
      appliances: [...state.appliances, { ...appliance, id: `appliance-${Date.now()}` }],
    })),
  updateAppliance: (id, changes) =>
    set((state) => ({
      appliances: state.appliances.map((a) => (a.id === id ? { ...a, ...changes } : a)),
    })),
  removeAppliance: (id) => set((state) => ({ appliances: state.appliances.filter((a) => a.id !== id) })),
  updateBillSettings: (changes) =>
    set((state) => {
      const billSettings = { ...state.billSettings, ...changes };
      return {
        billSettings,
        calibrationFactor: computeCalibrationFactor(state.appliances, billSettings.lastBillTotal, billSettings.lastBillKwh),
      };
    }),
  setTarget: (target) => set({ target }),
  setPlanMode: (planMode) => set({ planMode }),
  setPlan: (plan) => set({ plan }),
  refreshPlan: () => set(derive(get())),
  sendChatMessage: async (text) => {
    if (get().assistantStatus === 'thinking') return;
    const sentAt = Date.now();
    set((state) => ({
      assistantStatus: 'thinking',
      chat: [...state.chat, { id: `user-${sentAt}`, role: 'user', text, sentAt }],
    }));
    await respondTo(text);
  },
  retryLastMessage: async () => {
    const { chat, assistantStatus } = get();
    if (assistantStatus === 'thinking') return;
    const last = chat[chat.length - 1];
    // Only a user message nobody answered can be retried.
    if (!last || last.role !== 'user') {
      set({ assistantStatus: 'ready' });
      return;
    }
    set({ assistantStatus: 'thinking' });
    await respondTo(last.text);
  },
  undoRevision: (messageId) => {
    const { chat } = get();
    const latest = [...chat].reverse().find((message) => message.role === 'assistant' && message.revision);
    if (!latest || latest.id !== messageId || latest.role !== 'assistant' || !latest.revision) return;

    const sentAt = Date.now();
    set({
      ...restoreInputs(get(), latest.revision),
      chat: [
        ...chat.map((message) => (message.id === messageId ? { ...message, revision: undefined } : message)),
        { id: `assistant-${sentAt}`, role: 'assistant', text: 'Undone. The plan is back to how it was.', sentAt },
      ],
    });
    get().refreshPlan();
  },
  setAssistantStatus: (assistantStatus) => set({ assistantStatus }),
  hydrate: (saved) => {
    const inputs = { ...saved, constraints: NO_CONSTRAINTS };
    set({ ...inputs, ...derive(inputs) });
  },
  resetAll: () => {
    set({ ...INITIAL_INPUTS, ...derive(INITIAL_INPUTS), chat: [], assistantStatus: 'ready' });
    // After the set: its change schedules a save of the defaults, which this cancels along with the stored copy.
    void clearPersistedState();
  },
}));

/**
 * The chat pipeline for one user message (the message is already in `chat`).
 *   1. interpret: the model turns the message into a validated action. Unreachable -> the offline reply.
 *   2. apply: the action changes the target, minimum hours or constraints, and the optimizer replans.
 *   3. explain: the model words the old and new plan, or a template does when it cannot.
 * Question and none skip step 2. Every figure shown comes from the optimizer, never from AI text.
 */
async function respondTo(text: string): Promise<void> {
  try {
    await runPipeline(text);
  } catch (error) {
    // Never leave the composer locked on "thinking".
    console.warn('Chat pipeline failed.', error);
    useAppStore.setState({ assistantStatus: 'unavailable' });
  }
}

async function runPipeline(text: string): Promise<void> {
  const { getState: get, setState: set } = useAppStore;
  const sentAt = Date.now();
  const reply = (replyText: string, revision?: PlanRevision): ChatMessage => ({
    id: `assistant-${sentAt}`,
    role: 'assistant',
    text: replyText,
    sentAt,
    revision,
  });
  const finish = (message: ChatMessage, changes: Partial<AppState> = {}) =>
    set((state) => ({ ...changes, assistantStatus: 'ready', chat: [...state.chat, message] }));

  const before = get();
  let interpretation;
  try {
    interpretation = await interpretMessage(text, before.appliances, before.target);
  } catch {
    set({ assistantStatus: 'unavailable' });
    return;
  }
  if (interpretation.kind === 'invalid') return finish(reply(DIDNT_CATCH_REPLY));

  // The household may have changed while the model was answering.
  const { appliances, billSettings, calibrationFactor, target, planMode, constraints, plan, baseline } = get();
  const { action } = interpretation;

  if (!isPlanChange(action)) {
    if (!plan) return finish(reply(NO_PLAN_REPLY));
    return finish(reply(await answerFromPlan(text, action.action, plan, baseline, appliances)));
  }

  if (!actionTargetsExist(action, appliances)) return finish(reply(DIDNT_CATCH_REPLY));
  const inputs = applyAction(action, { appliances, target, constraints });
  const next = computePlan(inputs.appliances, billSettings, calibrationFactor, inputs.target, planMode, inputs.constraints);
  if (!next) return finish(reply(NO_PLAN_REPLY));

  if (!planChanged(plan, next)) {
    // Nothing the receipt would show, but keep the instruction (e.g. a kept appliance) for later plans.
    return finish(reply(NO_CHANGE_REPLY), inputs);
  }

  const revision: PlanRevision = {
    number: get().chat.filter((message) => message.role === 'assistant' && message.revision).length + 1,
    plan: next,
    previousPlan: plan,
    keptApplianceIds: inputs.constraints.keep,
    ...inputsBefore(action, { appliances, target, constraints }),
  };
  // Step 2 is done before the explanation is requested, so the plan on screen is already the new one.
  set({ ...inputs, plan: next });
  finish(reply(await explainPlanChange(text, action, appliances, plan, next), revision));
}

// Keep the plan in step with the household: any change to the appliances, bill settings, calibration, target or
// strategy recomputes it, whichever screen made the change. Constraints are not watched: the chat
// sets them together with the plan it computed, and undo recomputes explicitly.
useAppStore.subscribe((state, previous) => {
  if (
    state.appliances !== previous.appliances ||
    state.billSettings !== previous.billSettings ||
    state.calibrationFactor !== previous.calibrationFactor ||
    state.target !== previous.target ||
    state.planMode !== previous.planMode
  ) {
    state.refreshPlan();
  }
});
