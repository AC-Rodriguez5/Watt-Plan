import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { colors, radii, spacing, themedStyles } from '@/constants/theme';

/** Right side of the Bill settings header: overflow icon and the profile avatar, as drawn in the design. */
export function BillHeaderActions() {
  return (
    <View style={styles.row}>
      <View style={styles.iconSlot}>
        <Icon name="more_vert" size={24} color={colors.onSurfaceVariant} />
      </View>
      <View style={styles.avatar}>
        <Icon name="person" size={18} color={colors.onPrimary} />
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconSlot: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
}));
