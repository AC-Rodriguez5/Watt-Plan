import { act } from 'react';
import { createRoot } from 'test-renderer';

import { BreakdownDashboard, JourneyDashboard } from '@/components/home-layouts';
import { summarizeHome } from '@/optimizer/home-summary';
import { buildBaseline } from '@/optimizer/optimizer';
import { SAMPLE_APPLIANCES, SAMPLE_BILL_SETTINGS, SAMPLE_CALIBRATION_FACTOR } from '@/store/sample-household';
import { formatPeso } from '@/utils/format';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), navigate: jest.fn() } }));
jest.mock('@/global.css', () => ({}));
jest.mock('@/components/icon', () => ({ Icon: () => null }));

type Json = string | { children?: Json[] };

function texts(node: Json): string[] {
  return typeof node === 'string' ? [node] : (node.children ?? []).flatMap(texts);
}

const baseline = buildBaseline(SAMPLE_APPLIANCES, SAMPLE_BILL_SETTINGS, SAMPLE_CALIBRATION_FACTOR);

async function render(layout: 'breakdown' | 'journey', target: number | null) {
  const summary = summarizeHome(baseline, target);
  const Layout = layout === 'breakdown' ? BreakdownDashboard : JourneyDashboard;
  const root = createRoot();
  await act(async () => root.render(<Layout summary={summary} bill={SAMPLE_BILL_SETTINGS} />));
  return { summary, shown: texts(root.container.toJSON() as Json).join('|') };
}

describe('Home summary figures for the other layouts', () => {
  it('splits the bill into the two costliest appliances and "Others", adding up to the whole', () => {
    const { slices, estimatedBill } = summarizeHome(baseline, 2000);
    expect(slices.map(({ label }) => label)).toEqual(['Inverter Aircon', 'Two-Door Refrigerator', 'Others']);
    expect(slices.reduce((sum, { share }) => sum + share, 0)).toBeCloseTo(1);
    expect(slices.reduce((sum, { cost }) => sum + cost, 0)).toBeCloseTo(estimatedBill);
  });

  it('names every appliance when there are three or fewer', () => {
    const small = buildBaseline(SAMPLE_APPLIANCES.slice(0, 3), SAMPLE_BILL_SETTINGS, SAMPLE_CALIBRATION_FACTOR);
    expect(summarizeHome(small, 2000).slices.every(({ applianceId }) => applianceId !== null)).toBe(true);
  });

  it('measures how close the bill is to the target, reaching 1 at or under it', () => {
    const { estimatedBill } = summarizeHome(baseline, null);
    expect(summarizeHome(baseline, null).targetProgress).toBe(0);
    expect(summarizeHome(baseline, estimatedBill / 2).targetProgress).toBeCloseTo(0.5);
    expect(summarizeHome(baseline, estimatedBill * 2).targetProgress).toBe(1);
  });
});

describe('Where it goes (layout B)', () => {
  it('shows the total in the ring, each slice with its share, and how much to cut', async () => {
    const { summary, shown } = await render('breakdown', 2000);
    expect(shown).toContain(formatPeso(summary.estimatedBill));
    expect(shown).toContain(`Others ${Math.round(summary.slices[2].share * 100)}%`);
    expect(shown).toContain(`${formatPeso(summary.excess)} to cut`);
    expect(shown).toContain('Make a plan');
  });

  it('offers to set a target when there is none', async () => {
    const { shown } = await render('breakdown', null);
    expect(shown).toContain('Set a target');
  });
});

describe('Bill journey (layout C)', () => {
  it('shows now and the target, and how much to cut to get there', async () => {
    const { summary, shown } = await render('journey', 2000);
    expect(shown).toContain(`Now|${formatPeso(summary.estimatedBill)}`);
    expect(shown).toContain(`Target|${formatPeso(2000)}`);
    expect(shown).toContain(`Cut ${formatPeso(summary.excess)} to get there`);
    for (const shortcut of ['Appliances', 'Bill', 'Biggest', 'Ask']) expect(shown).toContain(shortcut);
  });

  it('says how far under the target the bill is', async () => {
    const { summary, shown } = await render('journey', 10_000);
    expect(shown).toContain(`${formatPeso(summary.headroom)} under your target`);
  });
});
