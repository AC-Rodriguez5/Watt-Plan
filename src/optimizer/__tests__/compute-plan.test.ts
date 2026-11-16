import { SAMPLE_APPLIANCES, SAMPLE_BILL_SETTINGS, SAMPLE_CALIBRATION_FACTOR } from '@/store/sample-household';

import { computePlan } from '../compute-plan';
import * as optimizer from '../optimizer';

describe('computePlan', () => {
  afterEach(() => jest.restoreAllMocks());

  it('uses the optimizer', () => {
    const plan = computePlan(SAMPLE_APPLIANCES, SAMPLE_BILL_SETTINGS, SAMPLE_CALIBRATION_FACTOR, 2000, 'fewest-changes');
    expect(plan).toEqual(optimizer.optimize(SAMPLE_APPLIANCES, SAMPLE_BILL_SETTINGS, SAMPLE_CALIBRATION_FACTOR, 2000, 'fewest-changes'));
  });

  it('falls back to the stub planner only when the optimizer throws', () => {
    jest.spyOn(optimizer, 'optimize').mockImplementation(() => {
      throw new Error('boom');
    });
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const plan = computePlan(SAMPLE_APPLIANCES, SAMPLE_BILL_SETTINGS, SAMPLE_CALIBRATION_FACTOR, 2000, 'fewest-changes');

    expect(warn).toHaveBeenCalledTimes(1);
    expect(plan).not.toBeNull();
    expect(plan?.status).toBe('feasible');
    expect(plan?.floor).toBeGreaterThan(0);
  });

  it('prices the fallback plan from the stored factor too', () => {
    jest.spyOn(optimizer, 'optimize').mockImplementation(() => {
      throw new Error('boom');
    });
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const household = [...SAMPLE_APPLIANCES, { id: 'pump', name: 'Water Pump', category: 'essential' as const, watts: 750, hoursPerDay: 3, daysPerWeek: 7 }];

    const plan = computePlan(household, SAMPLE_BILL_SETTINGS, SAMPLE_CALIBRATION_FACTOR, 2000, 'fewest-changes');

    const { cost } = optimizer.buildBaseline(household, SAMPLE_BILL_SETTINGS, SAMPLE_CALIBRATION_FACTOR);
    expect(plan?.currentEstimate).toBeCloseTo(cost, 6);
    expect(plan?.currentEstimate).toBeGreaterThan(3400);
  });
});
