import { applianceListItems } from '@/optimizer/appliance-list';
import { buildBaseline } from '@/optimizer/optimizer';
import { SAMPLE_APPLIANCES, SAMPLE_BILL_SETTINGS, SAMPLE_CALIBRATION_FACTOR } from '@/store/sample-household';
import type { Appliance } from '@/types/energy';

const NO_BILL = { lastBillTotal: null, lastBillKwh: null };

describe('applianceListItems', () => {
  it('gives every appliance its baseline cost', () => {
    const baseline = buildBaseline(SAMPLE_APPLIANCES, SAMPLE_BILL_SETTINGS, SAMPLE_CALIBRATION_FACTOR);
    const items = applianceListItems(baseline);

    expect(items).toHaveLength(baseline.items.length);
    for (const { appliance, cost } of baseline.items) {
      expect(items.find((item) => item.appliance.id === appliance.id)?.cost).toBeCloseTo(cost);
    }
  });

  it('puts the costliest appliance first, and keeps the added order for equal costs', () => {
    const fan = { category: 'flexible', watts: 60, hoursPerDay: 8, daysPerWeek: 7 } as const;
    const appliances: Appliance[] = [
      { id: 'tv', name: 'TV', category: 'flexible', watts: 100, hoursPerDay: 2, daysPerWeek: 7 },
      { id: 'fan-1', name: 'Fan 1', ...fan },
      { id: 'aircon', name: 'Aircon', category: 'luxury', watts: 900, hoursPerDay: 8, daysPerWeek: 7 },
      { id: 'fan-2', name: 'Fan 2', ...fan },
    ];
    const items = applianceListItems(buildBaseline(appliances, NO_BILL, 1));

    expect(items.map(({ appliance }) => appliance.id)).toEqual(['aircon', 'fan-1', 'fan-2', 'tv']);
    const costs = items.map(({ cost }) => cost);
    expect(costs).toEqual([...costs].sort((a, b) => b - a));
  });

  it('sets the share of the bill on the costliest appliance only', () => {
    const baseline = buildBaseline(SAMPLE_APPLIANCES, SAMPLE_BILL_SETTINGS, SAMPLE_CALIBRATION_FACTOR);
    const flagged = applianceListItems(baseline).filter(({ shareOfBill }) => shareOfBill !== null);

    expect(flagged).toHaveLength(1);
    expect(flagged[0].appliance.id).toBe('aircon');
    expect(flagged[0].shareOfBill).toBeCloseTo(flagged[0].cost / baseline.cost);
  });

  it('prices an added appliance instead of leaving it at zero', () => {
    const heater: Appliance = { id: 'appliance-1', name: 'Water Heater', category: 'luxury', watts: 3000, hoursPerDay: 1, daysPerWeek: 7 };
    const items = applianceListItems(buildBaseline([...SAMPLE_APPLIANCES, heater], SAMPLE_BILL_SETTINGS, SAMPLE_CALIBRATION_FACTOR));

    expect(items.find(({ appliance }) => appliance.id === heater.id)?.cost).toBeGreaterThan(0);
  });

  it('flags nothing for a single appliance or a household that costs nothing', () => {
    const [aircon] = SAMPLE_APPLIANCES;
    expect(applianceListItems(buildBaseline([aircon], NO_BILL, 1))[0].shareOfBill).toBeNull();

    const idle = SAMPLE_APPLIANCES.map((appliance) => ({ ...appliance, hoursPerDay: 0 }));
    expect(applianceListItems(buildBaseline(idle, NO_BILL, 1)).every(({ shareOfBill }) => shareOfBill === null)).toBe(true);
  });
});
