import type { Plan, PlanConstraints } from './energy';

/** One plan change made in chat. Kept so the receipt can be redrawn and the change undone. */
export type PlanRevision = {
  /** 1 for the first change in the chat, then 2, 3, ... */
  number: number;
  /** Plan after this change. */
  plan: Plan;
  /** Plan before this change. Null when there was none. */
  previousPlan: Plan | null;
  /** Constraints before this change, restored by Undo. */
  constraintsBefore: PlanConstraints;
  /** Appliances the user asked to leave alone, shown as "untouched" lines. */
  keptApplianceIds: string[];
};

export type ChatMessage =
  | { id: string; role: 'user'; text: string; sentAt: number }
  | { id: string; role: 'assistant'; text: string; sentAt: number; revision?: PlanRevision };
