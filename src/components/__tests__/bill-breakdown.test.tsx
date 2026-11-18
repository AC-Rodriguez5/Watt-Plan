import { act } from 'react';
import { createRoot } from 'test-renderer';

import { BillBreakdown } from '@/components/bill-breakdown';

jest.mock('@/global.css', () => ({}));
jest.mock('@/components/icon', () => ({ Icon: () => null }));

type Json = string | { children?: Json[] };

function texts(node: Json): string[] {
  return typeof node === 'string' ? [node] : (node.children ?? []).flatMap(texts);
}

async function render(seniorDiscount: number | null) {
  const root = createRoot();
  await act(async () =>
    root.render(
      <BillBreakdown
        values={{ total: '100.00', kwh: '50', generation: '20.00', distribution: '30.00', taxes: '50.00' }}
        errors={{}}
        onChange={() => {}}
        seniorDiscount={seniorDiscount}
      />,
    ),
  );
  const trigger = root.container.queryAll((node) => node.props.accessibilityLabel === 'Break down the charges')[0];
  await act(async () => trigger?.props.onClick?.({}));
  return texts(root.container.toJSON() as Json).join('');
}

describe('bill breakdown senior discount line', () => {
  it('shows the applied discount as a negative amount', async () => {
    const shown = await render(-42.5);
    expect(shown).toContain('Senior Discount (5%)');
    expect(shown).toContain('-₱42.50');
  });

  it.each([null, 0, 0.01])('hides the line when no discount is applied (%s)', async (discount) => {
    const shown = await render(discount);
    expect(shown).not.toContain('Senior Discount (5%)');
  });
});
