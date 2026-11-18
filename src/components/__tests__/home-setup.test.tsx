import { act } from 'react';
import { createRoot } from 'test-renderer';

import { HomeSetup } from '@/components/home-setup';

jest.mock('expo-router', () => ({ router: { navigate: jest.fn(), push: jest.fn() } }));
jest.mock('expo-image', () => ({ Image: () => null }));
jest.mock('@/global.css', () => ({}));
jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: () => null,
  Defs: () => null,
  LinearGradient: () => null,
  Polygon: () => null,
  Rect: () => null,
  Stop: () => null,
}));
jest.mock('@/components/icon', () => ({ Icon: () => null }));

type Json = string | { children?: Json[] };

function texts(node: Json): string[] {
  return typeof node === 'string' ? [node] : (node.children ?? []).flatMap(texts);
}

describe('Home setup estimates', () => {
  it('shows a zero bill and zero predicted kWh before household data exists', async () => {
    const root = createRoot();
    await act(async () =>
      root.render(<HomeSetup target={null} dailyKwh={0} hasAppliances={false} estimatedBill={0} predictedKwh={0} />),
    );

    const shown = texts(root.container.toJSON() as Json).join('');
    expect(shown).toContain('Estimated bill');
    expect(shown).toContain('₱0');
    expect(shown).toContain('Predicted');
    expect(shown).toContain('0.0 kWh');
    expect(shown).toContain('Setup in 2 quick steps');
  });
});
