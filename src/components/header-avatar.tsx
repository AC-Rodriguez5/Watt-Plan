import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { colors, radii } from '@/constants/theme';

/** Profile avatar at the right of a pushed screen's header, as drawn in the design. */
export function HeaderAvatar() {
  return (
    <View style={styles.avatar}>
      <Icon name="person" size={18} color={colors.onPrimary} />
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
});
