import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { colors, radii, shadows, spacing, typography, themedStyles } from '@/constants/theme';

/**
 * Top app bar shared by the tab screens. `title` is the tab's name, so the bar says where you are.
 * `onMenu` adds a ⋮ button (Home uses it for the Display sheet).
 */
export function AppHeader({ title, onMenu }: { title: string; onMenu?: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <View style={styles.brand}>
          <Icon name="bolt" size={28} color={colors.primary} />
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
        </View>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Bill Settings"
            onPress={() => router.push('/bill-settings')}
            style={styles.iconButton}>
            <Icon name="tune" size={24} color={colors.onSurfaceVariant} />
          </Pressable>
          {onMenu && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Display options"
              onPress={onMenu}
              style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}>
              <Icon name="more_vert" size={24} color={colors.onSurfaceVariant} />
            </Pressable>
          )}
          <View style={styles.avatar}>
            <Icon name="person" size={18} color={colors.onPrimary} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  container: {
    backgroundColor: colors.surface,
    boxShadow: shadows.appBar,
  },
  bar: {
    height: 64,
    paddingHorizontal: spacing.margin,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.titleLg,
    color: colors.onSurface,
    letterSpacing: -0.2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
  },
  iconButtonPressed: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
