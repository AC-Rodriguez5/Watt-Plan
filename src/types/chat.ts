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
  /** Target before this change, restored by Undo. Absent when the change did not touch the target. */
  targetBefore?: number | null;
  /** Minimum hours before this change, restored by Undo. Absent when the change did not touch them. */
  minHoursBefore?: { applianceId: string; hours: number | undefined };
};

/**
 * What the AI understood from a chat message, after validation (src/ai/interpret.ts). The only
 * numbers it can carry are the ones the user asked for: a new monthly target, or an appliance's
 * minimum hours per day. Everything else is an appliance id.
 */
export type ChatAction =
  | { action: 'keep'; applianceIds: string[] }
  | { action: 'cut_first'; applianceIds: string[] }
  | { action: 'set_target'; target: number }
  | { action: 'set_min_hours'; applianceId: string; hours: number }
  | { action: 'question' }
  | { action: 'none' };

/** Actions that change the plan, as opposed to the ones that only get an answer. */
export type PlanChangeAction = Exclude<ChatAction, { action: 'question' | 'none' }>;

/**
 * Whether the assistant can answer right now. 'thinking' shows the loading reply and
 * locks the composer; 'unavailable' shows the offline reply with Try again.
 */
export type AssistantStatus = 'ready' | 'thinking' | 'unavailable';

export type ChatMessage =
  | { id: string; role: 'user'; text: string; sentAt: number }
  | { id: string; role: 'assistant'; text: string; sentAt: number; revision?: PlanRevision };
