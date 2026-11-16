import { SAMPLE_APPLIANCES, SAMPLE_BILL_SETTINGS, SAMPLE_CALIBRATION_FACTOR } from '@/store/sample-household';
import { NO_CONSTRAINTS, type PlanConstraints } from '@/types/energy';

import { computePlan } from '../compute-plan';
import { lowestReachableTarget } from '../plan-revision';

const plan = (target: number, constraints: PlanConstraints = NO_CONSTRAINTS) =>
  computePlan(SAMPLE_APPLIANCES, SAMPLE_BILL_SETTINGS, SAMPLE_CALIBRATION_FACTOR, target, 'fewest-changes', constraints)!;

describe('lowestReachableTarget', () => {
  it('rounds the floor up to a whole peso', () => {
    expect(lowestReachableTarget({ floor: 1650.2 })).toBe(1651);
    expect(lowestReachableTarget({ floor: 1650 })).toBe(1650);
  });

  it('turns an unreachable plan into a feasible one when used as the target', () => {
    const unreachable = plan(300);
    expect(unreachable.status).toBe('not-reachable');

    const target = lowestReachableTarget(unreachable);
    const accepted = plan(target);
    expect(accepted.status).toBe('feasible');
    expect(accepted.target).toBe(target);
    expect(accepted.projectedBill).toBeLessThanOrEqual(target);
    expect(Number.isInteger(target)).toBe(true);
  });

  it('accounts for appliances the user asked to keep', () => {
    const constraints = { keep: ['aircon'], cutFirst: [] };
    const unreachable = plan(300, constraints);
    expect(plan(lowestReachableTarget(unreachable), constraints).status).toBe('feasible');
    // Keeping the aircon makes the lowest bill higher than without it.
    expect(lowestReachableTarget(unreachable)).toBeGreaterThan(lowestReachableTarget(plan(300)));
  });
});
