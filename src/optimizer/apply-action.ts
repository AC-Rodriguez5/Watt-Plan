import type { ChatAction, PlanChangeAction } from '@/types/chat';
import type { Appliance, PlanConstraints } from '@/types/energy';

/** The inputs a chat action can change. Everything else about the household is left alone. */
export type ActionInputs = {
  appliances: Appliance[];
  target: number | null;
  constraints: PlanConstraints;
};

export function isPlanChange(action: ChatAction): action is PlanChangeAction {
  return action.action !== 'question' && action.action !== 'none';
}

/** Folds a newly asked-for change into the constraints already in force. An appliance is either kept or cut first, never both. */
export function mergeConstraints(current: PlanConstraints, change: { keep: string[]; cutFirst: string[] }): PlanConstraints {
  return {
    keep: [...current.keep.filter((id) => !change.cutFirst.includes(id)), ...change.keep.filter((id) => !current.keep.includes(id))],
    cutFirst: [
      ...current.cutFirst.filter((id) => !change.keep.includes(id)),
      ...change.cutFirst.filter((id) => !current.cutFirst.includes(id)),
    ],
  };
}

/** The ids a plan-changing action points at. */
export function actionApplianceIds(action: PlanChangeAction): string[] {
  switch (action.action) {
    case 'keep':
    case 'cut_first':
      return action.applianceIds;
    case 'set_min_hours':
      return [action.applianceId];
    case 'set_target':
      return [];
  }
}

/** True when every appliance the action names is still in the household. */
export function actionTargetsExist(action: PlanChangeAction, appliances: Appliance[]): boolean {
  return actionApplianceIds(action).every((id) => appliances.some((appliance) => appliance.id === id));
}

/**
 * Applies a validated action to the inputs and returns the new ones. The action carries the only
 * numbers that may change (target, minimum hours), both validated by src/ai/interpret.ts.
 */
export function applyAction(action: PlanChangeAction, inputs: ActionInputs): ActionInputs {
  switch (action.action) {
    case 'keep':
      return { ...inputs, constraints: mergeConstraints(inputs.constraints, { keep: action.applianceIds, cutFirst: [] }) };
    case 'cut_first':
      return { ...inputs, constraints: mergeConstraints(inputs.constraints, { keep: [], cutFirst: action.applianceIds }) };
    case 'set_target':
      return { ...inputs, target: action.target };
    case 'set_min_hours':
      return {
        ...inputs,
        appliances: inputs.appliances.map((appliance) =>
          appliance.id === action.applianceId ? { ...appliance, minHoursPerDay: action.hours } : appliance,
        ),
      };
  }
}

/** The pieces of the inputs the action replaced, so Undo can put them back. */
export function inputsBefore(action: PlanChangeAction, inputs: ActionInputs) {
  const applianceBefore = action.action === 'set_min_hours' ? inputs.appliances.find(({ id }) => id === action.applianceId) : undefined;
  return {
    constraintsBefore: inputs.constraints,
    targetBefore: action.action === 'set_target' ? inputs.target : undefined,
    minHoursBefore: applianceBefore ? { applianceId: applianceBefore.id, hours: applianceBefore.minHoursPerDay } : undefined,
  };
}

/** Restores the pieces `inputsBefore` captured. */
export function restoreInputs(
  current: ActionInputs,
  before: { constraintsBefore: PlanConstraints; targetBefore?: number | null; minHoursBefore?: { applianceId: string; hours: number | undefined } },
): ActionInputs {
  const { minHoursBefore } = before;
  return {
    constraints: before.constraintsBefore,
    target: before.targetBefore !== undefined ? before.targetBefore : current.target,
    appliances: minHoursBefore
      ? current.appliances.map((appliance) =>
          appliance.id === minHoursBefore.applianceId ? { ...appliance, minHoursPerDay: minHoursBefore.hours } : appliance,
        )
      : current.appliances,
  };
}
