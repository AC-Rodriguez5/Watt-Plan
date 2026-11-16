import { SAMPLE_APPLIANCES } from '@/store/sample-household';
import { applianceIcon } from '@/utils/appliance-icon';
import { APPLIANCE_PRESETS } from '@/utils/appliance-presets';

describe('applianceIcon', () => {
  it('keeps the icons the sample household had', () => {
    expect(Object.fromEntries(SAMPLE_APPLIANCES.map(({ id, name }) => [id, applianceIcon(name)]))).toEqual({
      aircon: 'ac_unit',
      refrigerator: 'kitchen',
      tv: 'tv',
      'stand-fan': 'mode_fan',
      'rice-cooker': 'soup_kitchen',
      washer: 'local_laundry_service',
    });
  });

  it('gives every quick-add preset a matching icon, not the fallback', () => {
    for (const { name } of Object.values(APPLIANCE_PRESETS)) expect(applianceIcon(name)).not.toBe('bolt');
  });

  it('recognises appliances the user names themselves', () => {
    expect(applianceIcon('Aircon no. 3')).toBe('ac_unit');
    expect(applianceIcon('Bedroom AC')).toBe('ac_unit');
    expect(applianceIcon('Kitchen Ref')).toBe('kitchen');
    expect(applianceIcon('Ceiling fan')).toBe('mode_fan');
    expect(applianceIcon('LED lights')).toBe('lightbulb');
  });

  it('does not match a word that only contains a keyword', () => {
    expect(applianceIcon('Vacuum')).toBe('bolt');
    expect(applianceIcon('Fancy speaker')).toBe('bolt');
  });
});
