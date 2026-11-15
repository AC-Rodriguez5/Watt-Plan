import { SAMPLE_APPLIANCES, SAMPLE_BILL_SETTINGS } from '@/store/sample-household';

import { computePlan } from '../compute-plan';
import * as optimizer from '../optimizer';

describe('computePlan', () => {
  afterEach(() => jest.restoreAllMocks());

  it('uses the optimizer', () => {
    const plan = computePlan(SAMPLE_APPLIANCES, SAMPLE_BILL_SETTINGS, 2000, 'fewest-changes');
    expect(plan).toEqual(optimizer.optimize(SAMPLE_APPLIANCES, SAMPLE_BILL_SETTINGS, 2000, 'fewest-changes'));
  });

  it('falls back to the stub planner only when the optimizer throws', () => {
    jest.spyOn(optimizer, 'optimize').mockImplementation(() => {
      throw new Error('boom');
    });
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const plan = computePlan(SAMPLE_APPLIANCES, SAMPLE_BILL_SETTINGS, 2000, 'fewest-changes');

    expect(warn).toHaveBeenCalledTimes(1);
    expect(plan).not.toBeNull();
    expect(plan?.status).toBe('feasible');
    expect(plan?.floor).toBeGreaterThan(0);
  });
});
