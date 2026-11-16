import { act } from 'react';
import { createRoot } from 'test-renderer';

import AppliancesScreen from '@/app/(tabs)/appliances';
import { oneHourTip } from '@/optimizer/home-summary';
import { useAppStore } from '@/store/app-store';
import { SAMPLE_APPLIANCES, SAMPLE_BILL_SETTINGS, SAMPLE_CALIBRATION_FACTOR } from '@/store/sample-household';
import { formatPeso, formatWhole } from '@/utils/format';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/global.css', () => ({}));
jest.mock('@/components/icon', () => ({ Icon: () => null }));

type Json = string | { children?: Json[] };

function texts(node: Json): string[] {
  return typeof node === 'string' ? [node] : (node.children ?? []).flatMap(texts);
}

async function renderScreen() {
  const root = createRoot();
  await act(async () => root.render(<AppliancesScreen />));
  const shown = () => texts(root.container.toJSON() as Json).join('');
  return { root, shown };
}

describe('Appliances tab: estimated monthly load', () => {
  beforeEach(() => {
    useAppStore.setState({ billSettings: SAMPLE_BILL_SETTINGS, calibrationFactor: SAMPLE_CALIBRATION_FACTOR });
    useAppStore.setState({ appliances: SAMPLE_APPLIANCES });
  });

  it('shows the store baseline cost and kWh, not a fixed figure', async () => {
    const { shown } = await renderScreen();
    const { cost, kwh } = useAppStore.getState().baseline;
    expect(shown()).toContain(formatPeso(cost));
    expect(shown()).toContain(`${formatWhole(kwh)} kWh`);
  });

  it('goes up when a high-wattage appliance is added', async () => {
    const { shown } = await renderScreen();
    const before = useAppStore.getState().baseline;

    await act(async () => {
      useAppStore.getState().addAppliance({
        name: 'Heater',
        category: 'luxury',
        watts: 5000,
        hoursPerDay: 10,
        daysPerWeek: 7,
      });
    });

    const after = useAppStore.getState().baseline;
    expect(after.cost).toBeGreaterThan(before.cost);
    expect(after.kwh).toBeGreaterThan(before.kwh);
    expect(shown()).toContain(formatPeso(after.cost));
    expect(shown()).toContain(`${formatWhole(after.kwh)} kWh`);
    expect(shown()).not.toContain(formatPeso(before.cost));
  });

  it('prices an added appliance on its card instead of showing ₱0', async () => {
    const { shown } = await renderScreen();

    await act(async () => {
      useAppStore.getState().addAppliance({ name: 'Water Heater', category: 'luxury', watts: 3000, hoursPerDay: 1, daysPerWeek: 7 });
    });

    const item = useAppStore.getState().baseline.items.find(({ appliance }) => appliance.name === 'Water Heater')!;
    expect(item.cost).toBeGreaterThan(0);
    expect(shown()).toContain(formatPeso(item.cost));
    expect(shown()).not.toContain('₱0');
  });

  it('shows a tip priced by the optimizer, not a fixed figure', async () => {
    const { shown } = await renderScreen();
    const tip = oneHourTip(useAppStore.getState().baseline)!;

    expect(shown()).toContain(`Cut ${tip.applianceName} by 1 hour a day to save about ${formatPeso(tip.saving)} a month.`);
    expect(shown()).not.toContain('₱320');
  });

  it('filters the cards as you type a search', async () => {
    const { root, shown } = await renderScreen();
    const byLabel = (label: string) => root.container.queryAll((node) => node.props.accessibilityLabel === label)[0];

    await act(async () => byLabel('Search appliances')?.props.onClick?.({}));
    await act(async () => byLabel('Search appliances')?.props.onChangeText('fan'));
    expect(shown()).toContain('Stand Fan');
    expect(shown()).not.toContain('Two-Door Refrigerator');

    await act(async () => byLabel('Search appliances')?.props.onChangeText('zzz'));
    expect(shown()).toContain('No appliance matches "zzz"');

    await act(async () => byLabel('Close search')?.props.onClick?.({}));
    expect(shown()).toContain('Two-Door Refrigerator');
  });

  it('goes down when an appliance is removed', async () => {
    const { shown } = await renderScreen();
    const before = useAppStore.getState().baseline;

    await act(async () => useAppStore.getState().removeAppliance('aircon'));

    const after = useAppStore.getState().baseline;
    expect(after.cost).toBeLessThan(before.cost);
    expect(shown()).toContain(formatPeso(after.cost));
  });
});
