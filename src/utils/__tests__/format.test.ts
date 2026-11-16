import { formatPercent, splitPeso } from '@/utils/format';

describe('splitPeso', () => {
  it('keeps the real centavos', () => {
    expect(splitPeso(3412.67)).toEqual({ whole: '₱3,412', cents: '67' });
    expect(splitPeso(3400)).toEqual({ whole: '₱3,400', cents: '00' });
  });

  it('carries rounding into the whole pesos', () => {
    expect(splitPeso(1999.996)).toEqual({ whole: '₱2,000', cents: '00' });
  });
});

describe('formatPercent', () => {
  it('shows one decimal', () => {
    expect(formatPercent(0.4567)).toBe('45.7%');
    expect(formatPercent(1)).toBe('100.0%');
  });
});
