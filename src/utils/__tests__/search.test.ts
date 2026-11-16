import { searchPresets } from '@/utils/appliance-presets';
import { matchesQuery } from '@/utils/search';

describe('matchesQuery', () => {
  it('matches part of a name, ignoring case and spaces', () => {
    expect(matchesQuery('Inverter Aircon', 'AIR')).toBe(true);
    expect(matchesQuery('Inverter Aircon', '  con ')).toBe(true);
    expect(matchesQuery('Inverter Aircon', 'fan')).toBe(false);
  });

  it('matches everything when the query is empty', () => {
    expect(matchesQuery('Stand Fan', '')).toBe(true);
    expect(matchesQuery('Stand Fan', '   ')).toBe(true);
  });
});

describe('searchPresets', () => {
  const names = (query: string) => searchPresets(query).map(({ preset }) => preset.name);

  it('finds presets whose name contains the query', () => {
    expect(names('air')).toEqual(['Aircon']);
    expect(names('fan')).toEqual(['Stand Fan']);
    expect(names('wash')).toEqual(['Washing Machine']);
  });

  it('suggests nothing for an empty query, an unknown one, or a name that already is a preset', () => {
    expect(names('')).toEqual([]);
    expect(names('toaster')).toEqual([]);
    expect(names('smart tv')).toEqual([]);
  });

  it('returns at most the limit', () => {
    expect(searchPresets('e', 2)).toHaveLength(2);
  });
});
