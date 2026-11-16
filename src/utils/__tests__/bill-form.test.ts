import { formatRatesAsOf } from '../billing-period';
import { validateBillForm, type BillFormValues } from '../bill-form';

const values = (changes: Partial<BillFormValues>): BillFormValues => ({
  total: '',
  kwh: '',
  generation: '',
  distribution: '',
  taxes: '',
  ...changes,
});

describe('validateBillForm', () => {
  it('requires the kWh', () => {
    const result = validateBillForm(values({ total: '3,400.00' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.kwh).toBeDefined();
  });

  it('rejects a kWh of zero or text', () => {
    expect(validateBillForm(values({ kwh: '0' })).ok).toBe(false);
    expect(validateBillForm(values({ kwh: 'lots' })).ok).toBe(false);
  });

  it('accepts the kWh alone: the total is optional', () => {
    const result = validateBillForm(values({ kwh: '283' }));
    expect(result).toEqual({
      ok: true,
      value: { lastBillTotal: null, lastBillKwh: 283, generationCharge: null, distributionCharge: null, taxesCharge: null },
    });
  });

  it('keeps a total when one is given, and still checks it', () => {
    const ok = validateBillForm(values({ kwh: '283', total: '3,400.00' }));
    expect(ok.ok && ok.value.lastBillTotal).toBe(3400);

    const bad = validateBillForm(values({ kwh: '283', total: '0' }));
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors.total).toBeDefined();
  });
});

describe('formatRatesAsOf', () => {
  it('spells out the month and year', () => {
    expect(formatRatesAsOf('2026-11')).toBe('Rates as of November 2026');
    expect(formatRatesAsOf('2027-01')).toBe('Rates as of January 2027');
  });

  it('is empty for anything that is not YYYY-MM', () => {
    expect(formatRatesAsOf('')).toBe('');
    expect(formatRatesAsOf('2026-13')).toBe('');
    expect(formatRatesAsOf('November 2026')).toBe('');
  });
});
