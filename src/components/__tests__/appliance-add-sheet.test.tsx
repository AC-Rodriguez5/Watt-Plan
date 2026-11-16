import { act } from 'react';
import { createRoot, type TestInstance } from 'test-renderer';

import ApplianceAddSheet from '@/app/appliance-add';
import { useAppStore } from '@/store/app-store';
import { SAMPLE_APPLIANCES } from '@/store/sample-household';
import { APPLIANCE_PRESETS, type AppliancePresetKey } from '@/utils/appliance-presets';
import { formatWhole } from '@/utils/format';

const mockParams: { preset?: string } = {};
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  router: { back: () => mockBack() },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/global.css', () => ({}));
jest.mock('@/components/icon', () => ({ Icon: () => null }));

const FIELD_LABELS = {
  name: 'Appliance name',
  watts: 'Power',
  hoursPerDay: 'Hours a day',
  daysPerWeek: 'Days a week',
  minHoursPerDay: 'Minimum hours a day',
} as const;

type Field = keyof typeof FIELD_LABELS;

function renderSheet() {
  const root = createRoot();

  const rerender = async (preset?: string) => {
    mockParams.preset = preset;
    await act(async () => root.render(<ApplianceAddSheet />));
  };

  const input = (field: Field): TestInstance | undefined =>
    root.container.queryAll((node) => node.props.accessibilityLabel === FIELD_LABELS[field])[0];
  const value = (field: Field) => input(field)?.props.value;
  const type = (field: Field, text: string) => act(async () => input(field)?.props.onChangeText(text));

  const selectedCategory = () =>
    root.container
      .queryAll((node) => node.props.accessibilityRole === 'radio' && node.props.accessibilityState?.checked === true)
      .flatMap((node) => node.queryAll((child) => typeof child.props.children === 'string'))
      .map((child) => child.props.children)[0];

  const press = (label: string) =>
    act(async () => {
      const button = root.container
        .queryAll((node) => node.props.accessibilityRole === 'button' && node.queryAll((n) => n.props.children === label).length > 0)
        .at(-1);
      button?.props.onClick?.({});
    });

  const pressLabel = (label: string) =>
    act(async () => {
      const button = root.container.queryAll(
        (node) => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === label,
      )[0];
      button?.props.onClick?.({});
    });

  const stepLabel = (): string | undefined =>
    root.container.queryAll(
      (node) => typeof node.props.accessibilityLabel === 'string' && node.props.accessibilityLabel.startsWith('Step '),
    )[0]?.props.accessibilityLabel;

  const shown = () =>
    root.container
      .queryAll((node) => typeof node.props.children === 'string')
      .map((node) => node.props.children as string);

  return { root, rerender, value, type, selectedCategory, press, pressLabel, stepLabel, shown };
}

describe('add-appliance sheet', () => {
  beforeEach(() => {
    useAppStore.setState({ appliances: SAMPLE_APPLIANCES });
    mockBack.mockClear();
    delete mockParams.preset;
  });

  it('opens empty when no preset is given (the FAB)', async () => {
    const sheet = renderSheet();
    await sheet.rerender();
    expect(sheet.value('name')).toBe('');
    expect(sheet.value('watts')).toBe('');
    expect(sheet.value('hoursPerDay')).toBe('');
    expect(sheet.value('daysPerWeek')).toBe('7');
    expect(sheet.value('minHoursPerDay')).toBe('');
    expect(sheet.selectedCategory()).toBe('Essential');
  });

  it('pre-fills every field from the tapped chip', async () => {
    const sheet = renderSheet();
    await sheet.rerender('tv');
    expect(sheet.value('name')).toBe('Smart TV');
    expect(sheet.value('watts')).toBe('100');
    expect(sheet.value('hoursPerDay')).toBe('5');
    expect(sheet.value('daysPerWeek')).toBe('7');
    expect(sheet.value('minHoursPerDay')).toBe('2');
    expect(sheet.selectedCategory()).toBe('Flexible');
  });

  it('shows the luxury category for Aircon, which has no lowest-hours field', async () => {
    const sheet = renderSheet();
    await sheet.rerender('aircon');
    expect(sheet.value('name')).toBe('Aircon');
    expect(sheet.value('watts')).toBe('900');
    expect(sheet.selectedCategory()).toBe('Luxury');
    expect(sheet.value('minHoursPerDay')).toBeUndefined();
  });

  it('keeps pre-filled fields editable', async () => {
    const sheet = renderSheet();
    await sheet.rerender('aircon');
    await sheet.type('watts', '1200');
    await sheet.type('name', 'Bedroom Aircon');
    expect(sheet.value('watts')).toBe('1200');
    expect(sheet.value('name')).toBe('Bedroom Aircon');
  });

  it("never leaks a previous chip's values, including edits, into the next open", async () => {
    const sheet = renderSheet();
    await sheet.rerender('tv');
    await sheet.type('name', 'Edited TV');
    await sheet.type('minHoursPerDay', '4');

    await sheet.rerender('washer');
    expect(sheet.value('name')).toBe('Washing Machine');
    expect(sheet.value('watts')).toBe('450');
    expect(sheet.value('hoursPerDay')).toBe('2');
    expect(sheet.value('daysPerWeek')).toBe('3');
    expect(sheet.value('minHoursPerDay')).toBe('1');

    await sheet.rerender(undefined);
    expect(sheet.value('name')).toBe('');
    expect(sheet.value('watts')).toBe('');
    expect(sheet.value('daysPerWeek')).toBe('7');
    expect(sheet.value('minHoursPerDay')).toBe('');
    expect(sheet.selectedCategory()).toBe('Essential');
  });

  it('opens empty after a chip, even from a freshly mounted sheet', async () => {
    const first = renderSheet();
    await first.rerender('refrigerator');
    expect(first.value('name')).toBe('Refrigerator');
    await act(async () => first.root.unmount());

    const second = renderSheet();
    await second.rerender();
    expect(second.value('name')).toBe('');
    expect(second.value('minHoursPerDay')).toBe('');
  });

  it('opens empty for an unknown preset', async () => {
    const sheet = renderSheet();
    await sheet.rerender('toaster-oven');
    expect(sheet.value('name')).toBe('');
  });

  it('Save adds the pre-filled appliance to the store and closes the sheet', async () => {
    const sheet = renderSheet();
    await sheet.rerender('aircon');
    await sheet.press('Next');
    await sheet.type('hoursPerDay', '6');
    await sheet.press('Next');
    await sheet.press('Save');

    const { appliances } = useAppStore.getState();
    expect(appliances).toHaveLength(SAMPLE_APPLIANCES.length + 1);
    expect(appliances.at(-1)).toMatchObject({
      name: 'Aircon',
      watts: 900,
      hoursPerDay: 6,
      daysPerWeek: 7,
      category: 'luxury',
    });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});

describe('add-appliance steps', () => {
  beforeEach(() => {
    useAppStore.setState({ appliances: SAMPLE_APPLIANCES });
    mockBack.mockClear();
    delete mockParams.preset;
  });

  it('starts on step 1 and stays there until the name and power are valid', async () => {
    const sheet = renderSheet();
    await sheet.rerender();
    expect(sheet.stepLabel()).toBe('Step 1 of 3: What is it');

    await sheet.press('Next');
    expect(sheet.stepLabel()).toBe('Step 1 of 3: What is it');
    expect(sheet.shown()).toContain('Enter a name');

    await sheet.type('name', 'Water Heater');
    await sheet.type('watts', '3000');
    await sheet.press('Next');
    expect(sheet.stepLabel()).toBe('Step 2 of 3: How you use it');
  });

  it('moves forward with Next and back with Back, keeping what was typed', async () => {
    const sheet = renderSheet();
    await sheet.rerender('tv');
    await sheet.press('Next');
    await sheet.type('hoursPerDay', '3');
    await sheet.press('Next');
    expect(sheet.stepLabel()).toBe('Step 3 of 3: Priority');

    await sheet.press('Back');
    expect(sheet.stepLabel()).toBe('Step 2 of 3: How you use it');
    expect(sheet.value('hoursPerDay')).toBe('3');
  });

  it('jumps back to the step with a problem when Save finds one', async () => {
    const sheet = renderSheet();
    await sheet.rerender('tv');
    await sheet.press('Next');
    await sheet.press('Next');
    await sheet.type('hoursPerDay', '');
    await sheet.press('Save');

    expect(sheet.stepLabel()).toBe('Step 2 of 3: How you use it');
    expect(useAppStore.getState().appliances).toHaveLength(SAMPLE_APPLIANCES.length);
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('shows the same monthly cost the appliance list shows once it is saved', async () => {
    const sheet = renderSheet();
    await sheet.rerender('aircon');
    await sheet.press('Next');
    const shownWhileAdding = sheet.shown();
    await sheet.press('Next');
    await sheet.press('Save');

    const saved = useAppStore.getState().baseline.items.at(-1)!;
    expect(saved.appliance.name).toBe('Aircon');
    expect(shownWhileAdding).toContain(formatWhole(saved.cost));
  });

  it('suggests presets while typing the name and fills the form from the one picked', async () => {
    const sheet = renderSheet();
    await sheet.rerender();
    await sheet.type('name', 'air');
    await sheet.pressLabel('Use Aircon');

    expect(sheet.value('name')).toBe('Aircon');
    expect(sheet.value('watts')).toBe('900');
    expect(sheet.value('hoursPerDay')).toBe('8');
    expect(sheet.selectedCategory()).toBe('Luxury');
    // The name now is a preset's, so the suggestions go away.
    expect(sheet.shown()).not.toContain('900 W');
  });
});

describe('APPLIANCE_PRESETS', () => {
  it.each(Object.keys(APPLIANCE_PRESETS) as AppliancePresetKey[])('%s is a valid appliance', (key) => {
    const { hoursPerDay, daysPerWeek, watts, name, category, ...rest } = APPLIANCE_PRESETS[key];
    const minHoursPerDay = 'minHoursPerDay' in rest ? rest.minHoursPerDay : undefined;
    expect(name).not.toBe('');
    expect(watts).toBeGreaterThan(0);
    expect(hoursPerDay).toBeGreaterThan(0);
    expect(hoursPerDay).toBeLessThanOrEqual(24);
    expect(daysPerWeek).toBeGreaterThanOrEqual(1);
    expect(daysPerWeek).toBeLessThanOrEqual(7);
    if (category === 'luxury') {
      expect(minHoursPerDay).toBeUndefined();
    } else {
      expect(minHoursPerDay).toBeDefined();
      expect(minHoursPerDay).toBeLessThanOrEqual(hoursPerDay);
    }
  });
});
