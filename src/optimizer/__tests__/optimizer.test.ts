import { computeCalibrationFactor } from '@/optimizer/bill-calibration';
import { SAMPLE_APPLIANCES, SAMPLE_BILL_SETTINGS, SAMPLE_CALIBRATION_FACTOR } from '@/store/sample-household';
import type { Appliance, Plan, PlanMode } from '@/types/energy';

import { buildBaseline, estimateAppliance, optimize } from '../optimizer';

const MODES: PlanMode[] = ['fewest-changes', 'comfort-first'];
const BILL = SAMPLE_BILL_SETTINGS; // ₱3,400 for 283 kWh

/** The factor the app stores when this household's bill settings are saved. */
const factorFor = (appliances: Appliance[]) => computeCalibrationFactor(appliances, BILL.lastBillTotal, BILL.lastBillKwh);

/** Independent restatement of the model, so the tests do not just echo the implementation. */
function expectedBill(appliances: Appliance[], hoursOf: (appliance: Appliance) => number): number {
  const kwh = (a: Appliance, hours: number) => (a.watts * hours * a.daysPerWeek * 4.33) / 1000;
  const raw = appliances.reduce((sum, a) => sum + kwh(a, a.hoursPerDay), 0);
  const factor = BILL.lastBillKwh! / raw;
  const rate = BILL.lastBillTotal! / BILL.lastBillKwh!;
  return appliances.reduce((sum, a) => sum + kwh(a, hoursOf(a)) * factor * rate, 0);
}

/** Lowest hours: luxury 0, essential and flexible at their minimum (or untouched when they have none). */
const floorHoursOf = (a: Appliance) => (a.category === 'luxury' ? 0 : (a.minHoursPerDay ?? a.hoursPerDay));

function plan(target: number, mode: PlanMode = 'fewest-changes', appliances = SAMPLE_APPLIANCES): Plan {
  const result = optimize(appliances, BILL, factorFor(appliances), target, mode);
  if (!result) throw new Error('expected a plan');
  return result;
}

describe('baseline', () => {
  it('scales the appliances so they add up to the last bill', () => {
    const baseline = buildBaseline(SAMPLE_APPLIANCES, BILL, factorFor(SAMPLE_APPLIANCES));
    expect(baseline.isCalibrated).toBe(true);
    expect(baseline.cost).toBeCloseTo(3400, 6);
    expect(baseline.kwh).toBeCloseTo(283, 6);
    expect(baseline.items.reduce((sum, { cost }) => sum + cost, 0)).toBeCloseTo(3400, 6);
  });

  it('prices each appliance at its calibrated share of the bill', () => {
    const baseline = buildBaseline(SAMPLE_APPLIANCES, BILL, factorFor(SAMPLE_APPLIANCES));
    const aircon = baseline.items.find(({ appliance }) => appliance.id === 'aircon')!;
    const everything = expectedBill(SAMPLE_APPLIANCES, (a) => a.hoursPerDay);
    const airconOnly = expectedBill(SAMPLE_APPLIANCES, (a) => (a.id === 'aircon' ? a.hoursPerDay : 0));
    expect(everything).toBeCloseTo(3400, 6);
    expect(aircon.cost).toBeCloseTo(airconOnly, 6);
  });

  it('falls back to the default rate and no scaling without a bill', () => {
    const baseline = buildBaseline(SAMPLE_APPLIANCES, { lastBillTotal: null, lastBillKwh: null }, SAMPLE_CALIBRATION_FACTOR);
    expect(baseline.isCalibrated).toBe(false);
    expect(baseline.calibrationFactor).toBe(1);
    expect(baseline.ratePerKwh).toBe(12.5);
  });
});

describe('stored calibration factor', () => {
  const PUMP: Appliance = { id: 'pump', name: 'Water Pump', category: 'essential', watts: 750, hoursPerDay: 3, daysPerWeek: 7 };
  const withPump = [...SAMPLE_APPLIANCES, PUMP];

  it('is billed kWh over the appliances kWh, and 1 without a usable bill', () => {
    const rawKwh = SAMPLE_APPLIANCES.reduce((sum, a) => sum + (a.watts * a.hoursPerDay * a.daysPerWeek * 4.33) / 1000, 0);
    expect(computeCalibrationFactor(SAMPLE_APPLIANCES, 3400, 283)).toBeCloseTo(283 / rawKwh, 9);
    expect(SAMPLE_CALIBRATION_FACTOR).toBeCloseTo(283 / rawKwh, 9);
    expect(computeCalibrationFactor(SAMPLE_APPLIANCES, null, null)).toBe(1);
    expect(computeCalibrationFactor(SAMPLE_APPLIANCES, 3400, null)).toBe(1);
    expect(computeCalibrationFactor(SAMPLE_APPLIANCES, 0, 283)).toBe(1);
    expect(computeCalibrationFactor([], 3400, 283)).toBe(1);
  });

  it('is reused as given, so an added appliance raises the baseline instead of being scaled away', () => {
    const before = buildBaseline(SAMPLE_APPLIANCES, BILL, SAMPLE_CALIBRATION_FACTOR);
    const after = buildBaseline(withPump, BILL, SAMPLE_CALIBRATION_FACTOR);
    expect(after.calibrationFactor).toBe(SAMPLE_CALIBRATION_FACTOR);
    expect(after.cost).toBeGreaterThan(before.cost + 1);
    expect(after.kwh).toBeGreaterThan(before.kwh);
    // Each appliance already in the household keeps its cost.
    expect(after.items[0].cost).toBeCloseTo(before.items[0].cost, 9);
    // Recalibrating (a new factor for the new household) is what brings it back to the bill.
    expect(buildBaseline(withPump, BILL, factorFor(withPump)).cost).toBeCloseTo(3400, 6);
  });

  it('reaches the plan: its current estimate follows the baseline', () => {
    const result = optimize(withPump, BILL, SAMPLE_CALIBRATION_FACTOR, 2000, 'fewest-changes')!;
    expect(result.currentEstimate).toBeCloseTo(buildBaseline(withPump, BILL, SAMPLE_CALIBRATION_FACTOR).cost, 6);
    expect(result.currentEstimate).toBeGreaterThan(3400);
  });

  it('is ignored without a bill', () => {
    const noBill = { lastBillTotal: null, lastBillKwh: null };
    expect(buildBaseline(withPump, noBill, 7).calibrationFactor).toBe(1);
  });
});

describe('estimateAppliance', () => {
  it('gives each appliance the same kWh and cost the baseline gives it', () => {
    const baseline = buildBaseline(SAMPLE_APPLIANCES, SAMPLE_BILL_SETTINGS, SAMPLE_CALIBRATION_FACTOR);
    for (const item of baseline.items) {
      const estimate = estimateAppliance(item.appliance, SAMPLE_BILL_SETTINGS, SAMPLE_CALIBRATION_FACTOR);
      expect(estimate.kwh).toBeCloseTo(item.kwh);
      expect(estimate.cost).toBeCloseTo(item.cost);
      expect(estimate.ratePerKwh).toBeCloseTo(baseline.ratePerKwh);
    }
  });

  it('ignores the stored factor while there is no bill, like the baseline', () => {
    const noBill = { lastBillTotal: null, lastBillKwh: null };
    const [aircon] = SAMPLE_APPLIANCES;
    const estimate = estimateAppliance(aircon, noBill, 0.5);
    expect(estimate.cost).toBeCloseTo(buildBaseline([aircon], noBill, 0.5).cost);
    expect(estimate.cost).toBeCloseTo(estimateAppliance(aircon, noBill, 1).cost);
  });
});

describe('optimize', () => {
  it.each(MODES)('brings the sample household to a ₱2,000 target (%s)', (mode) => {
    const result = plan(2000, mode);
    expect(result.status).toBe('feasible');
    expect(result.currentEstimate).toBeCloseTo(3400, 6);
    expect(result.projectedBill).toBeLessThanOrEqual(2000 + 1e-6);
    // Cuts move in half-hour steps, so it overshoots by less than one step of the aircon.
    expect(result.projectedBill).toBeGreaterThan(1800);
    expect(result.cuts.length).toBeGreaterThan(0);
    expect(result.totalCuts).toBeCloseTo(result.currentEstimate - result.projectedBill, 6);
    expect(result.kwhSaved).toBeGreaterThan(0);
    expect(result.co2SavedKg).toBeCloseTo(result.kwhSaved * 0.55, 9);
  });

  it('cuts luxury before flexible', () => {
    const result = plan(2000);
    expect(result.cuts.map(({ applianceId }) => applianceId)).toEqual(['aircon']);
    const [aircon] = result.cuts;
    expect(aircon.fromHoursPerDay).toBe(8);
    expect(aircon.toHoursPerDay % 0.5).toBe(0);
  });

  it('reports the saving of each change in pesos', () => {
    const result = plan(2000);
    const baseline = buildBaseline(SAMPLE_APPLIANCES, BILL, factorFor(SAMPLE_APPLIANCES));
    for (const cut of result.cuts) {
      const item = baseline.items.find(({ appliance }) => appliance.id === cut.applianceId)!;
      const expected = item.cost * ((cut.fromHoursPerDay - cut.toHoursPerDay) / cut.fromHoursPerDay);
      expect(cut.saving).toBeCloseTo(expected, 6);
    }
  });

  it('returns feasible: false and the floor when the target is below it', () => {
    const floor = expectedBill(SAMPLE_APPLIANCES, floorHoursOf);
    for (const mode of MODES) {
      const result = plan(500, mode);
      expect(result.status).toBe('not-reachable');
      expect(result.floor).toBeCloseTo(floor, 6);
      expect(result.projectedBill).toBeCloseTo(floor, 6);
      // Every appliance that can be cut is cut all the way to its floor.
      for (const cut of result.cuts) {
        const appliance = SAMPLE_APPLIANCES.find(({ id }) => id === cut.applianceId)!;
        expect(cut.toHoursPerDay).toBe(floorHoursOf(appliance));
      }
    }
  });

  it('treats a target exactly at the floor as reachable', () => {
    const floor = expectedBill(SAMPLE_APPLIANCES, floorHoursOf);
    expect(plan(floor).status).toBe('feasible');
    expect(plan(floor - 1).status).toBe('not-reachable');
  });

  it('never cuts an essential below its minimum hours, whatever the target', () => {
    const household: Appliance[] = [
      ...SAMPLE_APPLIANCES,
      { id: 'pump', name: 'Water Pump', category: 'essential', watts: 750, hoursPerDay: 3, daysPerWeek: 7, minHoursPerDay: 1.25 },
    ];
    for (const mode of MODES) {
      for (const target of [3000, 2500, 2000, 1500, 1000, 500, 1]) {
        const result = plan(target, mode, household);
        for (const cut of result.cuts) {
          const appliance = household.find(({ id }) => id === cut.applianceId)!;
          if (appliance.category === 'luxury') continue;
          expect(cut.toHoursPerDay).toBeGreaterThanOrEqual(appliance.minHoursPerDay ?? appliance.hoursPerDay);
        }
      }
    }
    // Pushed all the way down, the pump lands exactly on its minimum and the fridge is untouched.
    const lowest = plan(1, 'fewest-changes', household);
    expect(lowest.cuts.find(({ applianceId }) => applianceId === 'pump')?.toHoursPerDay).toBe(1.25);
    expect(lowest.cuts.find(({ applianceId }) => applianceId === 'refrigerator')).toBeUndefined();
  });

  it('cuts essentials only after luxury and flexible are used up', () => {
    const household: Appliance[] = [
      { id: 'pump', name: 'Water Pump', category: 'essential', watts: 750, hoursPerDay: 3, daysPerWeek: 7, minHoursPerDay: 1 },
      { id: 'tv', name: 'TV', category: 'flexible', watts: 100, hoursPerDay: 5, daysPerWeek: 7, minHoursPerDay: 2 },
    ];
    const baseline = buildBaseline(household, BILL, factorFor(household));
    const tv = baseline.items[1];
    // Needs a little more than the TV can give.
    const target = baseline.cost - tv.costPerDailyHour * 3 - 1;
    const result = optimize(household, BILL, factorFor(household), target, 'fewest-changes')!;
    expect(result.cuts.find(({ applianceId }) => applianceId === 'tv')?.toHoursPerDay).toBe(2);
    expect(result.cuts.find(({ applianceId }) => applianceId === 'pump')).toBeDefined();
  });

  it.each(MODES)('returns no changes when the target is above the current bill (%s)', (mode) => {
    const result = plan(5000, mode);
    expect(result.status).toBe('feasible');
    expect(result.cuts).toEqual([]);
    expect(result.totalCuts).toBe(0);
    expect(result.kwhSaved).toBe(0);
    expect(result.co2SavedKg).toBe(0);
    expect(result.projectedBill).toBeCloseTo(result.currentEstimate, 6);
  });

  it('returns null with no target or no appliances', () => {
    expect(optimize(SAMPLE_APPLIANCES, BILL, factorFor(SAMPLE_APPLIANCES), null, 'fewest-changes')).toBeNull();
    expect(optimize(SAMPLE_APPLIANCES, BILL, factorFor(SAMPLE_APPLIANCES), 0, 'fewest-changes')).toBeNull();
    expect(optimize([], BILL, 1, 2000, 'fewest-changes')).toBeNull();
  });

  it('leaves kept appliances alone and cuts the asked-for ones first', () => {
    const kept = optimize(SAMPLE_APPLIANCES, BILL, factorFor(SAMPLE_APPLIANCES), 2000, 'fewest-changes', { keep: ['aircon'], cutFirst: [] })!;
    expect(kept.cuts.find(({ applianceId }) => applianceId === 'aircon')).toBeUndefined();

    // Aircon alone could cover a ₱3,000 target, but the TV was asked for first, so it goes to its minimum.
    const plain = optimize(SAMPLE_APPLIANCES, BILL, factorFor(SAMPLE_APPLIANCES), 3000, 'fewest-changes')!;
    expect(plain.cuts.find(({ applianceId }) => applianceId === 'tv')).toBeUndefined();
    const first = optimize(SAMPLE_APPLIANCES, BILL, factorFor(SAMPLE_APPLIANCES), 3000, 'fewest-changes', { keep: [], cutFirst: ['tv'] })!;
    expect(first.cuts.find(({ applianceId }) => applianceId === 'tv')?.toHoursPerDay).toBe(2);
    expect(first.projectedBill).toBeLessThanOrEqual(3000 + 1e-6);
  });

  it('raises the floor when appliances are kept', () => {
    const plain = plan(500).floor;
    const kept = optimize(SAMPLE_APPLIANCES, BILL, factorFor(SAMPLE_APPLIANCES), 500, 'fewest-changes', { keep: ['aircon'], cutFirst: [] })!;
    expect(kept.floor).toBeGreaterThan(plain);
  });

  it('is deterministic', () => {
    expect(plan(2000, 'comfort-first')).toEqual(plan(2000, 'comfort-first'));
  });
});

describe('strategies', () => {
  const household: Appliance[] = [
    { id: 'ac-1', name: 'Bedroom Aircon', category: 'luxury', watts: 900, hoursPerDay: 8, daysPerWeek: 7 },
    { id: 'ac-2', name: 'Living Aircon', category: 'luxury', watts: 800, hoursPerDay: 8, daysPerWeek: 7 },
    { id: 'heater', name: 'Water Heater', category: 'luxury', watts: 1500, hoursPerDay: 1, daysPerWeek: 7 },
    { id: 'fridge', name: 'Refrigerator', category: 'essential', watts: 130, hoursPerDay: 24, daysPerWeek: 7 },
  ];
  const target = buildBaseline(household, BILL, factorFor(household)).cost * 0.7;

  it('fewest changes touches fewer appliances than comfort first', () => {
    const fewest = optimize(household, BILL, factorFor(household), target, 'fewest-changes')!;
    const comfort = optimize(household, BILL, factorFor(household), target, 'comfort-first')!;
    expect(fewest.status).toBe('feasible');
    expect(comfort.status).toBe('feasible');
    expect(fewest.cuts.length).toBeLessThan(comfort.cuts.length);
  });

  it('comfort first spreads the hours, so no single appliance takes as many', () => {
    const mostHours = (p: Plan) => Math.max(...p.cuts.map((c) => c.fromHoursPerDay - c.toHoursPerDay));
    expect(mostHours(optimize(household, BILL, factorFor(household), target, 'comfort-first')!)).toBeLessThan(
      mostHours(optimize(household, BILL, factorFor(household), target, 'fewest-changes')!),
    );
  });
});
