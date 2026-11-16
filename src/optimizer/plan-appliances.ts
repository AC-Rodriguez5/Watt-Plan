import type { Appliance, Plan } from '@/types/energy';

import type { Baseline } from './optimizer';

/** One appliance as the plan leaves it. */
export type PlanApplianceRow = {
  appliance: Appliance;
  /** Hours per day before the plan. */
  fromHoursPerDay: number;
  /** Hours per day after the plan. Equals `fromHoursPerDay` when the plan does not touch it. */
  toHoursPerDay: number;
  changed: boolean;
  /** Pesos per month before the plan: the appliance's baseline cost. */
  defaultCost: number;
  /** Pesos per month once the plan is applied. Equals `defaultCost` when unchanged. */
  monthlyCost: number;
  /** Pesos per month the plan saves on this appliance, as a positive number. 0 when unchanged. */
  saving: number;
};

/**
 * Every appliance with its hours and monthly cost under `plan`. Changed appliances come first, biggest
 * saving first; the rest follow, costliest first. The default costs add up to the plan's current
 * estimate and the optimized costs to its projected bill.
 * `baseline` and `plan` must come from the same household, as they do in the store.
 */
export function planApplianceRows(baseline: Baseline, plan: Plan): PlanApplianceRow[] {
  const rows = baseline.items.map<PlanApplianceRow>(({ appliance, cost }) => {
    const cut = plan.cuts.find(({ applianceId }) => applianceId === appliance.id);
    return {
      appliance,
      fromHoursPerDay: appliance.hoursPerDay,
      toHoursPerDay: cut ? cut.toHoursPerDay : appliance.hoursPerDay,
      changed: cut !== undefined,
      defaultCost: cost,
      monthlyCost: cut ? Math.max(0, cost - cut.saving) : cost,
      saving: cut ? cut.saving : 0,
    };
  });

  // Array.prototype.sort is stable, so ties keep the appliance list's order.
  return rows.sort((a, b) => {
    if (a.changed !== b.changed) return a.changed ? -1 : 1;
    return a.changed ? b.saving - a.saving : b.monthlyCost - a.monthlyCost;
  });
}
