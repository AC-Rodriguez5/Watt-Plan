import { act } from 'react';
import { createRoot } from 'test-renderer';

import BillSettingsScreen from '@/app/bill-settings';
import { useAppStore } from '@/store/app-store';
import { SAMPLE_APPLIANCES, SAMPLE_BILL_SETTINGS, SAMPLE_CALIBRATION_FACTOR } from '@/store/sample-household';

jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/global.css', () => ({}));
jest.mock('@/components/icon', () => ({ Icon: () => null }));

describe('bill settings senior discount toggle', () => {
  beforeEach(() => {
    useAppStore.setState({
      appliances: SAMPLE_APPLIANCES,
      billSettings: SAMPLE_BILL_SETTINGS,
      calibrationFactor: SAMPLE_CALIBRATION_FACTOR,
    });
  });

  it('starts off and updates the shared bill settings when pressed', async () => {
    const root = createRoot();
    await act(async () => root.render(<BillSettingsScreen />));

    const toggle = () => root.container.queryAll((node) => node.props.accessibilityLabel === 'Senior Citizen Discount')[0];
    expect(toggle()?.props.accessibilityState?.checked).toBe(false);

    await act(async () => toggle()?.props.onClick?.({}));

    expect(toggle()?.props.accessibilityState?.checked).toBe(true);
    expect(useAppStore.getState().billSettings.isRegisteredSenior).toBe(true);
    expect(root.container.queryAll((node) => node.props.children === '5% discount applies only if total consumption is 100 kWh or below.')).toHaveLength(1);
  });
});
