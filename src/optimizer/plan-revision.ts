import type { Plan, PlanCut } from '@/types/energy';

/** Pesos the projected bill sits under the target (positive) or over it (negative). */
export function targetMargin(plan: Pick<Plan, 'target' | 'projectedBill'>): number {
  return plan.target - plan.projectedBill;
}

/** Cuts in `plan` that are new or differ from the same appliance's cut in `previous`. */
export function changedCuts(plan: Plan, previous: Plan | null): PlanCut[] {
  if (!previous) return plan.cuts;
  return plan.cuts.filter((cut) => {
    const before = previous.cuts.find(({ applianceId }) => applianceId === cut.applianceId);
    return !before || before.toHoursPerDay !== cut.toHoursPerDay;
  });
}

/** True when two plans cut the same appliances to the same hours. */
export function samePlanCuts(a: Plan | null, b: Plan | null): boolean {
  if (!a || !b) return a === b;
  return a.cuts.length === b.cuts.length && changedCuts(a, b).length === 0;
}
