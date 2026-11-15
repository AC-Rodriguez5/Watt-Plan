import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, maxContentWidth, radii, shadows, spacing, typography } from '@/constants/theme';

/** How long a Snackbar stays before it dismisses itself. */
export const SNACKBAR_DURATION_MS = 6000;

type SnackbarProps = {
  message: string;
  actionLabel: string;
  onAction: () => void;
  onDismiss: () => void;
};

/**
 * A short message with one action, pinned to the bottom of its screen. Dismisses itself after
 * SNACKBAR_DURATION_MS. Render it with a new `key` per message so the timer starts over.
 */
export function Snackbar({ message, actionLabel, onAction, onDismiss }: SnackbarProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, SNACKBAR_DURATION_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <View style={styles.anchor} pointerEvents="box-none">
      <View style={styles.snackbar} accessibilityLiveRegion="polite">
        <Text style={styles.message}>{message}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onAction}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
          <Text style={styles.actionLabel}>{actionLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.md,
    alignItems: 'center',
    paddingHorizontal: spacing.margin,
  },
  snackbar: {
    width: '100%',
    maxWidth: maxContentWidth - spacing.margin * 2,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    borderRadius: radii.sm,
    backgroundColor: colors.inverseSurface,
    boxShadow: shadows.level3,
  },
  message: {
    ...typography.bodyMd,
    flex: 1,
    paddingVertical: spacing.sm,
    color: colors.inverseOnSurface,
  },
  action: {
    minHeight: 48,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
  },
  actionPressed: {
    backgroundColor: `${colors.inversePrimary}33`,
  },
  actionLabel: {
    ...typography.labelMd,
    color: colors.inversePrimary,
  },
});
