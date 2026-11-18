import { mockLlm } from '@/ai/__mocks__/llm-fetch';

import { computeCalibrationFactor } from '@/optimizer/bill-calibration';
import { summarizeHome } from '@/optimizer/home-summary';
import type { Appliance } from '@/types/energy';

import { useAppStore } from '../app-store';
import { computeBill } from '@/optimizer/meralco-bill';

import { SAMPLE_APPLIANCES, SAMPLE_BILL_SETTINGS, SAMPLE_CALIBRATION_FACTOR } from '../sample-household';

/** What the formula charges for the sample household's 283 kWh. */
const SAMPLE_BILL_TOTAL = computeBill(283).total;

const cutsAircon = () => useAppStore.getState().plan?.cuts.some(({ applianceId }) => applianceId === 'aircon');

describe('shared plan', () => {
  beforeEach(() => {
    useAppStore.setState({
      appliances: SAMPLE_APPLIANCES,
      billSettings: SAMPLE_BILL_SETTINGS,
      calibrationFactor: SAMPLE_CALIBRATION_FACTOR,
      constraints: { keep: [], cutFirst: [] },
      chat: [],
    });
    useAppStore.getState().setTarget(2000);
    useAppStore.getState().setPlanMode('fewest-changes');
  });

  it('has a plan and a baseline that agree', () => {
    const { plan, baseline } = useAppStore.getState();
    expect(plan?.status).toBe('feasible');
    expect(plan?.currentEstimate).toBeCloseTo(baseline.cost, 6);
  });

  it('recomputes when the target changes', () => {
    useAppStore.getState().setTarget(2500);
    expect(useAppStore.getState().plan?.target).toBe(2500);
    useAppStore.getState().setTarget(null);
    expect(useAppStore.getState().plan).toBeNull();
  });

  it('recomputes when an appliance changes', () => {
    useAppStore.getState().updateAppliance('aircon', { hoursPerDay: 12 });
    const { plan, baseline } = useAppStore.getState();
    expect(plan?.cuts[0].fromHoursPerDay).toBe(12);
    expect(baseline.items.find(({ appliance }) => appliance.id === 'aircon')?.appliance.hoursPerDay).toBe(12);
  });

  it('recomputes when the bill settings change', () => {
    useAppStore.getState().updateBillSettings({ lastBillTotal: null, lastBillKwh: 200 });
    const { plan, baseline } = useAppStore.getState();
    expect(baseline.kwh).toBeCloseTo(200, 6);
    expect(baseline.cost).toBeCloseTo(computeBill(200).total, 6);
    expect(plan?.currentEstimate).toBeCloseTo(computeBill(200).total, 6);
  });

  it('updates the senior discount immediately without changing calibrated kWh', () => {
    useAppStore.getState().updateBillSettings({ lastBillTotal: null, lastBillKwh: 100 });
    const factor = useAppStore.getState().calibrationFactor;
    const before = useAppStore.getState().baseline.cost;

    useAppStore.getState().setSeniorCitizenDiscount(true);

    const { baseline, billSettings } = useAppStore.getState();
    expect(billSettings.isRegisteredSenior).toBe(true);
    expect(useAppStore.getState().calibrationFactor).toBe(factor);
    expect(baseline.kwh).toBeCloseTo(100, 8);
    expect(baseline.cost).toBeLessThan(before);
    expect(baseline.seniorDiscount).toBeLessThan(0);
    expect(baseline.cost).toBeCloseTo(computeBill(100, undefined, { isRegisteredSenior: true }).total, 8);
  });

  it('recomputes when the strategy changes', () => {
    useAppStore.getState().setPlanMode('comfort-first');
    expect(useAppStore.getState().plan?.mode).toBe('comfort-first');
  });

  it('keeps the chat constraints when the household changes', async () => {
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'test-key';
    process.env.EXPO_PUBLIC_GROQ_API_KEY = 'test-groq-key';
    mockLlm({ interpret: [{ action: 'keep', appliance_ids: ['aircon'], value: null }], explain: ['Okay.'] });
    await useAppStore.getState().sendChatMessage("I can't cut the aircon");
    expect(cutsAircon()).toBe(false);
    useAppStore.getState().setTarget(2200);
    expect(cutsAircon()).toBe(false);
  });
});

describe('calibration factor', () => {
  const HEATER: Omit<Appliance, 'id'> = { name: 'Water Heater', category: 'luxury', watts: 3000, hoursPerDay: 4, daysPerWeek: 7 };

  beforeEach(() => {
    useAppStore.setState({
      appliances: SAMPLE_APPLIANCES,
      billSettings: SAMPLE_BILL_SETTINGS,
      calibrationFactor: SAMPLE_CALIBRATION_FACTOR,
      constraints: { keep: [], cutFirst: [] },
      chat: [],
    });
    useAppStore.getState().setTarget(2000);
    useAppStore.getState().setPlanMode('fewest-changes');
  });

  const home = () => summarizeHome(useAppStore.getState().baseline, useAppStore.getState().target);

  it('starts at the seeded factor, matching the sample bill', () => {
    const { calibrationFactor, baseline } = useAppStore.getState();
    expect(calibrationFactor).toBe(SAMPLE_CALIBRATION_FACTOR);
    expect(baseline.cost).toBeCloseTo(SAMPLE_BILL_TOTAL, 6);
  });

  it('adding an appliance raises the baseline, Home, the plan and the costliest list', () => {
    const before = { baseline: useAppStore.getState().baseline.cost, home: home().estimatedBill, plan: useAppStore.getState().plan!.currentEstimate };

    useAppStore.getState().addAppliance(HEATER);

    const { baseline, plan, calibrationFactor } = useAppStore.getState();
    expect(calibrationFactor).toBe(SAMPLE_CALIBRATION_FACTOR);
    expect(baseline.cost).toBeGreaterThan(before.baseline + 1);
    expect(home().estimatedBill).toBeGreaterThan(before.home + 1);
    expect(home().estimatedBill).toBeCloseTo(baseline.cost, 6);
    expect(plan!.currentEstimate).toBeGreaterThan(before.plan + 1);
    expect(plan!.currentEstimate).toBeCloseTo(baseline.cost, 6);
    expect(home().topCosts[0].appliance.name).toBe('Water Heater');
  });

  it('removing an appliance lowers the baseline', () => {
    useAppStore.getState().removeAppliance('aircon');
    const { baseline, calibrationFactor } = useAppStore.getState();
    expect(calibrationFactor).toBe(SAMPLE_CALIBRATION_FACTOR);
    expect(baseline.cost).toBeLessThan(SAMPLE_BILL_TOTAL - 1);
    expect(home().topCosts.map(({ appliance }) => appliance.id)).not.toContain('aircon');
  });

  it('editing an appliance changes the baseline', () => {
    useAppStore.getState().updateAppliance('tv', { hoursPerDay: 10 });
    expect(useAppStore.getState().baseline.cost).toBeGreaterThan(SAMPLE_BILL_TOTAL + 1);
    expect(useAppStore.getState().calibrationFactor).toBe(SAMPLE_CALIBRATION_FACTOR);
  });

  it('saving bill settings again recalibrates from the current appliances', () => {
    useAppStore.getState().addAppliance(HEATER);
    expect(useAppStore.getState().baseline.cost).toBeGreaterThan(SAMPLE_BILL_TOTAL + 1);

    useAppStore.getState().updateBillSettings({ lastBillTotal: 3400, lastBillKwh: 283 });

    const { calibrationFactor, appliances, baseline, plan } = useAppStore.getState();
    expect(calibrationFactor).toBeCloseTo(computeCalibrationFactor(appliances, 3400, 283), 12);
    expect(calibrationFactor).toBeLessThan(SAMPLE_CALIBRATION_FACTOR);
    expect(baseline.cost).toBeCloseTo(SAMPLE_BILL_TOTAL, 6);
    expect(plan!.currentEstimate).toBeCloseTo(SAMPLE_BILL_TOTAL, 6);
  });

  it('uses a factor of 1 when the saved bill settings have no bill', () => {
    useAppStore.getState().updateBillSettings({ lastBillTotal: null, lastBillKwh: null });
    const { calibrationFactor, baseline } = useAppStore.getState();
    expect(calibrationFactor).toBe(1);
    expect(baseline.isCalibrated).toBe(false);
    expect(baseline.calibrationFactor).toBe(1);
  });

  it('keeps the factor when only the target or strategy changes', () => {
    useAppStore.getState().setTarget(1500);
    useAppStore.getState().setPlanMode('comfort-first');
    expect(useAppStore.getState().calibrationFactor).toBe(SAMPLE_CALIBRATION_FACTOR);
  });
});
