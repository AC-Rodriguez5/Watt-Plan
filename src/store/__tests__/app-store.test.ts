import { useAppStore } from '../app-store';
import { SAMPLE_APPLIANCES } from '../sample-household';

const cutsAircon = () => useAppStore.getState().plan?.cuts.some(({ applianceId }) => applianceId === 'aircon');

describe('shared plan', () => {
  beforeEach(() => {
    useAppStore.setState({ appliances: SAMPLE_APPLIANCES, constraints: { keep: [], cutFirst: [] }, chat: [] });
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
    useAppStore.getState().updateBillSettings({ lastBillTotal: 4000, lastBillKwh: 283 });
    const { plan, baseline } = useAppStore.getState();
    expect(plan?.currentEstimate).toBeCloseTo(4000, 6);
    expect(baseline.cost).toBeCloseTo(4000, 6);
  });

  it('recomputes when the strategy changes', () => {
    useAppStore.getState().setPlanMode('comfort-first');
    expect(useAppStore.getState().plan?.mode).toBe('comfort-first');
  });

  it('keeps the chat constraints when the household changes', () => {
    useAppStore.getState().sendChatMessage("I can't cut the aircon");
    expect(cutsAircon()).toBe(false);
    useAppStore.getState().setTarget(2200);
    expect(cutsAircon()).toBe(false);
  });
});
