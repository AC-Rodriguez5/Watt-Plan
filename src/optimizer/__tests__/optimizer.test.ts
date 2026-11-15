import { SAMPLE_APPLIANCES, SAMPLE_BILL_SETTINGS } from '@/store/sample-household';
import type { Appliance, Plan, PlanMode } from '@/types/energy';

import { buildBaseline, optimize } from '../optimizer';

const MODES: PlanMode[] = ['fewest-changes', 'comfort-first'];
const BILL = SAMPLE_BILL_SETTINGS; // ₱3,400 for 283 kWh

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
  const result = optimize(appliances, BILL, target, mode);
  if (!result) throw new Error('expected a plan');
  return result;
}

describe('baseline', () => {
  it('scales the appliances so they add up to the last bill', () => {
    const baseline = buildBaseline(SAMPLE_APPLIANCES, BILL);
    expect(baseline.isCalibrated).toBe(true);
    expect(baseline.cost).toBeCloseTo(3400, 6);
    expect(baseline.kwh).toBeCloseTo(283, 6);
    expect(baseline.items.reduce((sum, { cost }) => sum + cost, 0)).toBeCloseTo(3400, 6);
  });

  it('prices each appliance at its calibrated share of the bill', () => {
    const baseline = buildBaseline(SAMPLE_APPLIANCES, BILL);
    const aircon = baseline.items.find(({ appliance }) => appliance.id === 'aircon')!;
    const everything = expectedBill(SAMPLE_APPLIANCES, (a) => a.hoursPerDay);
    const airconOnly = expectedBill(SAMPLE_APPLIANCES, (a) => (a.id === 'aircon' ? a.hoursPerDay : 0));
    expect(everything).toBeCloseTo(3400, 6);
    expect(aircon.cost).toBeCloseTo(airconOnly, 6);
  });

  it('falls back to the default rate and no scaling without a bill', () => {
    const baseline = buildBaseline(SAMPLE_APPLIANCES, { lastBillTotal: null, lastBillKwh: null });
    expect(baseline.isCalibrated).toBe(false);
    expect(baseline.calibrationFactor).toBe(1);
    expect(baseline.ratePerKwh).toBe(12.5);
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
    const baseline = buildBaseline(SAMPLE_APPLIANCES, BILL);
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
    const baseline = buildBaseline(household, BILL);
    const tv = baseline.items[1];
    // Needs a little more than the TV can give.
    const target = baseline.cost - tv.costPerDailyHour * 3 - 1;
    const result = optimize(household, BILL, target, 'fewest-changes')!;
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
    expect(optimize(SAMPLE_APPLIANCES, BILL, null, 'fewest-changes')).toBeNull();
    expect(optimize(SAMPLE_APPLIANCES, BILL, 0, 'fewest-changes')).toBeNull();
    expect(optimize([], BILL, 2000, 'fewest-changes')).toBeNull();
  });

  it('leaves kept appliances alone and cuts the asked-for ones first', () => {
    const kept = optimize(SAMPLE_APPLIANCES, BILL, 2000, 'fewest-changes', { keep: ['aircon'], cutFirst: [] })!;
    expect(kept.cuts.find(({ applianceId }) => applianceId === 'aircon')).toBeUndefined();

    // Aircon alone could cover a ₱3,000 target, but the TV was asked for first, so it goes to its minimum.
    const plain = optimize(SAMPLE_APPLIANCES, BILL, 3000, 'fewest-changes')!;
    expect(plain.cuts.find(({ applianceId }) => applianceId === 'tv')).toBeUndefined();
    const first = optimize(SAMPLE_APPLIANCES, BILL, 3000, 'fewest-changes', { keep: [], cutFirst: ['tv'] })!;
    expect(first.cuts.find(({ applianceId }) => applianceId === 'tv')?.toHoursPerDay).toBe(2);
    expect(first.projectedBill).toBeLessThanOrEqual(3000 + 1e-6);
  });

  it('raises the floor when appliances are kept', () => {
    const plain = plan(500).floor;
    const kept = optimize(SAMPLE_APPLIANCES, BILL, 500, 'fewest-changes', { keep: ['aircon'], cutFirst: [] })!;
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
  const target = buildBaseline(household, BILL).cost * 0.7;

  it('fewest changes touches fewer appliances than comfort first', () => {
    const fewest = optimize(household, BILL, target, 'fewest-changes')!;
    const comfort = optimize(household, BILL, target, 'comfort-first')!;
    expect(fewest.status).toBe('feasible');
    expect(comfort.status).toBe('feasible');
    expect(fewest.cuts.length).toBeLessThan(comfort.cuts.length);
  });

  it('comfort first spreads the hours, so no single appliance takes as many', () => {
    const mostHours = (p: Plan) => Math.max(...p.cuts.map((c) => c.fromHoursPerDay - c.toHoursPerDay));
    expect(mostHours(optimize(household, BILL, target, 'comfort-first')!)).toBeLessThan(
      mostHours(optimize(household, BILL, target, 'fewest-changes')!),
    );
  });
});
