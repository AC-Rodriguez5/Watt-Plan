import { validateTarget } from '../target-form';

describe('validateTarget', () => {
  it.each([
    ['2000', 2000],
    ['2,000.00', 2000],
    [' 3500.5 ', 3500.5],
  ])('accepts %s', (text, value) => {
    expect(validateTarget(text)).toEqual({ ok: true, value });
  });

  it.each(['', '   ', '0', '-5', 'abc', '1e3'])('rejects %j', (text) => {
    expect(validateTarget(text).ok).toBe(false);
  });
});
