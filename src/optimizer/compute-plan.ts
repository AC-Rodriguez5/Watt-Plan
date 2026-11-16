import { NO_CONSTRAINTS, type Appliance, type BillSettings, type Plan, type PlanConstraints, type PlanMode } from '@/types/energy';

import { optimize } from './optimizer';
import { planStub } from './stub-planner';

/**
 * The one way the app computes a plan: the optimizer, and the stub only if the optimizer throws.
 * Returns null when there is nothing to plan: no target, or no appliances.
 */
export function computePlan(
  appliances: Appliance[],
  bill: BillSettings,
  calibrationFactor: number,
  target: number | null,
  mode: PlanMode,
  constraints: PlanConstraints = NO_CONSTRAINTS,
): Plan | null {
  try {
    return optimize(appliances, bill, calibrationFactor, target, mode, constraints);
  } catch (error) {
    console.warn('Optimizer failed, using the fallback planner.', error);
    return planStub(appliances, bill, calibrationFactor, target, mode, constraints);
  }
}
