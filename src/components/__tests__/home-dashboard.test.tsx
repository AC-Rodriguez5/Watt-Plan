import { act } from 'react';
import { createRoot } from 'test-renderer';

import { HomeDashboard } from '@/components/home-dashboard';
import { buildBaseline } from '@/optimizer/optimizer';
import { summarizeHome } from '@/optimizer/home-summary';
import { SAMPLE_APPLIANCES, SAMPLE_BILL_SETTINGS, SAMPLE_CALIBRATION_FACTOR } from '@/store/sample-household';
import { formatPeso, splitPeso } from '@/utils/format';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), navigate: jest.fn() } }));
jest.mock('@/global.css', () => ({}));
jest.mock('@/components/icon', () => ({ Icon: () => null }));

type Json = string | { children?: Json[] };

function texts(node: Json): string[] {
  return typeof node === 'string' ? [node] : (node.children ?? []).flatMap(texts);
}

const baseline = buildBaseline(SAMPLE_APPLIANCES, SAMPLE_BILL_SETTINGS, SAMPLE_CALIBRATION_FACTOR);

async function render(target: number | null) {
  const summary = summarizeHome(baseline, target);
  const root = createRoot();
  await act(async () => root.render(<HomeDashboard summary={summary} bill={SAMPLE_BILL_SETTINGS} />));
  return { summary, shown: texts(root.container.toJSON() as Json).join('') };
}

describe('Home dashboard (bill at a glance)', () => {
  it('shows the estimated bill with its real centavos', async () => {
    const { shown } = await render(2000);
    const { whole, cents } = splitPeso(baseline.cost);
    expect(shown).toContain(`Estimated bill${whole}.${cents}`);
  });

  it('says how far over the target the bill is', async () => {
    const { summary, shown } = await render(2000);
    expect(summary.isOverTarget).toBe(true);
    expect(shown).toContain(`${formatPeso(summary.excess)} over`);
    expect(shown).toContain(`Target ${formatPeso(2000)}`);
  });

  it('says how far under the target the bill is', async () => {
    const { summary, shown } = await render(5000);
    expect(summary.headroom).toBeCloseTo(5000 - baseline.cost);
    expect(shown).toContain(`${formatPeso(summary.headroom)} under`);
    expect(shown).not.toContain(' over');
  });

  it('offers to set a target when there is none', async () => {
    const { shown } = await render(null);
    expect(shown).toContain('Set a target');
    expect(shown).not.toContain('Target ₱');
  });

  it('lists the top three spenders, costliest first, with the shortcuts', async () => {
    const { summary, shown } = await render(2000);
    const names = summary.topCosts.map(({ appliance }) => appliance.name);
    expect(names).toHaveLength(3);
    const positions = names.map((name) => shown.indexOf(name));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    for (const label of ['Add', 'Bill', 'Plan', 'Ask', 'Top spenders']) expect(shown).toContain(label);
  });
});
