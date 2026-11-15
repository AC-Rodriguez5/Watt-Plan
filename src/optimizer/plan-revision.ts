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

/** True when `next` differs from `previous` in anything the receipt shows: target, status or cuts. */
export function planChanged(previous: Plan | null, next: Plan | null): boolean {
  if (!previous || !next) return previous !== next;
  return previous.target !== next.target || previous.status !== next.status || !samePlanCuts(previous, next);
}

/** Pesos the projected bill moved between two plans: negative when it went down. */
export function projectedBillChange(previous: Plan, next: Plan): number {
  return next.projectedBill - previous.projectedBill;
}

/**
 * The lowest whole-peso target the household can actually reach: the plan's floor, rounded up so the
 * optimizer calls it feasible. "Use this plan" on an unreachable plan sets the target to this.
 */
export function lowestReachableTarget(plan: Pick<Plan, 'floor'>): number {
  return Math.ceil(plan.floor);
}
