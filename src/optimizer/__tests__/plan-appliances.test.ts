import {
  EMPTY_BILL_SETTINGS,
  SAMPLE_APPLIANCES,
  SAMPLE_BILL_SETTINGS,
  SAMPLE_CALIBRATION_FACTOR,
} from '@/store/sample-household';
import type { PlanMode } from '@/types/energy';

import { computePlan } from '../compute-plan';
import { buildBaseline } from '../optimizer';
import { planApplianceRows } from '../plan-appliances';

const baseline = buildBaseline(SAMPLE_APPLIANCES, SAMPLE_BILL_SETTINGS, SAMPLE_CALIBRATION_FACTOR);
const rowsFor = (target: number) => {
  const plan = computePlan(SAMPLE_APPLIANCES, SAMPLE_BILL_SETTINGS, SAMPLE_CALIBRATION_FACTOR, target, 'fewest-changes')!;
  return { plan, rows: planApplianceRows(baseline, plan) };
};

describe('planApplianceRows', () => {
  it('lists every appliance, changed ones first', () => {
    const { plan, rows } = rowsFor(2000);

    expect(rows).toHaveLength(SAMPLE_APPLIANCES.length);
    const changedCount = rows.filter(({ changed }) => changed).length;
    expect(changedCount).toBe(plan.cuts.length);
    expect(changedCount).toBeGreaterThan(0);
    expect(rows.slice(0, changedCount).every(({ changed }) => changed)).toBe(true);
    expect(rows.slice(changedCount).every(({ changed }) => !changed)).toBe(true);
  });

  it('sorts changed rows by saving and the rest by monthly cost', () => {
    const { rows } = rowsFor(2000);
    const changed = rows.filter(({ changed: isChanged }) => isChanged);
    const untouched = rows.filter(({ changed: isChanged }) => !isChanged);

    expect(changed.map(({ saving }) => saving)).toEqual([...changed.map(({ saving }) => saving)].sort((a, b) => b - a));
    expect(untouched.map(({ monthlyCost }) => monthlyCost)).toEqual(
      [...untouched.map(({ monthlyCost }) => monthlyCost)].sort((a, b) => b - a),
    );
  });

  it('prices changed rows after the cut and unchanged rows at their baseline', () => {
    const { rows } = rowsFor(2000);

    for (const row of rows) {
      const base = baseline.items.find(({ appliance }) => appliance.id === row.appliance.id)!;
      expect(row.monthlyCost).toBeCloseTo(base.cost - row.saving, 6);
      if (!row.changed) {
        expect(row.saving).toBe(0);
        expect(row.toHoursPerDay).toBe(row.fromHoursPerDay);
      } else {
        expect(row.toHoursPerDay).toBeLessThan(row.fromHoursPerDay);
      }
    }
  });

  it('keeps the default cost of every row at its baseline, changed or not', () => {
    const { rows } = rowsFor(2000);

    for (const row of rows) {
      const base = baseline.items.find(({ appliance }) => appliance.id === row.appliance.id)!;
      expect(row.defaultCost).toBe(base.cost);
      expect(row.defaultCost - row.monthlyCost).toBeCloseTo(row.saving, 6);
    }
  });

  describe('totals', () => {
    const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

    // Each state has its own baseline: a bill-calibrated household, and one with no bill entered
    // (default rate, factor 1). Targets are fractions of the current estimate: met already, a
    // moderate cut, a deep cut, and one far below what any household could reach.
    const states = [
      { name: 'normal (bill entered)', bill: SAMPLE_BILL_SETTINGS, factor: SAMPLE_CALIBRATION_FACTOR },
      { name: 'missing bill', bill: EMPTY_BILL_SETTINGS, factor: 1 },
    ];
    const targets = [
      { name: 'target already met', fraction: 3 },
      { name: 'moderate cut', fraction: 0.8 },
      { name: 'deep cut', fraction: 0.5 },
      { name: 'not reachable', fraction: 0.01 },
    ];
    const modes: PlanMode[] = ['fewest-changes', 'comfort-first'];

    const cases = states.flatMap((state) =>
      targets.flatMap((target) => modes.map((mode) => ({ state, target, mode }))),
    );

    it.each(cases)('$state.name, $target.name, $mode: default costs sum to the current estimate', ({ state, target, mode }) => {
      const base = buildBaseline(SAMPLE_APPLIANCES, state.bill, state.factor);
      const plan = computePlan(SAMPLE_APPLIANCES, state.bill, state.factor, base.cost * target.fraction, mode)!;
      const rows = planApplianceRows(base, plan);

      expect(rows).toHaveLength(SAMPLE_APPLIANCES.length);
      expect(sum(rows.map(({ defaultCost }) => defaultCost))).toBeCloseTo(plan.currentEstimate, 4);
    });

    it.each(cases)('$state.name, $target.name, $mode: optimized costs sum to the projected bill', ({ state, target, mode }) => {
      const base = buildBaseline(SAMPLE_APPLIANCES, state.bill, state.factor);
      const plan = computePlan(SAMPLE_APPLIANCES, state.bill, state.factor, base.cost * target.fraction, mode)!;
      const rows = planApplianceRows(base, plan);

      expect(sum(rows.map(({ monthlyCost }) => monthlyCost))).toBeCloseTo(plan.projectedBill, 4);
    });

    it('covers the not-reachable status, where the projected bill is the floor', () => {
      const base = buildBaseline(SAMPLE_APPLIANCES, SAMPLE_BILL_SETTINGS, SAMPLE_CALIBRATION_FACTOR);
      const plan = computePlan(SAMPLE_APPLIANCES, SAMPLE_BILL_SETTINGS, SAMPLE_CALIBRATION_FACTOR, base.cost * 0.01, 'fewest-changes')!;
      const rows = planApplianceRows(base, plan);

      expect(plan.status).toBe('not-reachable');
      expect(plan.projectedBill).toBeCloseTo(plan.floor, 6);
      expect(sum(rows.map(({ monthlyCost }) => monthlyCost))).toBeCloseTo(plan.floor, 4);
    });

    it('covers the missing-bill state with an uncalibrated baseline', () => {
      const base = buildBaseline(SAMPLE_APPLIANCES, EMPTY_BILL_SETTINGS, 1);
      expect(base.isCalibrated).toBe(false);
    });
  });

  it('leaves every row unchanged when the target is already met', () => {
    const { rows } = rowsFor(10_000);
    expect(rows.every(({ changed }) => !changed)).toBe(true);
  });
});
