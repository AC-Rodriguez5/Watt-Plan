import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { colors, fontFamilies, radii, shadows, spacing, typography } from '@/constants/theme';
import type { Plan } from '@/types/energy';
import { formatPeso } from '@/utils/format';

/** Pinned "Projected ₱1,985 · Target ₱2,000 · ON TRACK" pill at the top of Plan chat. Reads the shared plan. */
export function ChatSummaryStrip({ plan }: { plan: Plan }) {
  const onTrack = plan.status === 'feasible';
  return (
    <View style={styles.wrapper}>
      <View style={styles.strip}>
        <View style={styles.left}>
          <View style={[styles.badge, { backgroundColor: onTrack ? colors.tertiaryContainer : colors.alert }]}>
            <Icon name={onTrack ? 'check' : 'priority_high'} size={16} color={colors.onTertiaryContainer} />
          </View>
          <View style={styles.figures}>
            <Text style={styles.projected} numberOfLines={1}>
              Projected <Text style={styles.projectedAmount}>{formatPeso(plan.projectedBill)}</Text>
            </Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.target} numberOfLines={1}>
              Target {formatPeso(plan.target)}
            </Text>
          </View>
        </View>
        <View style={styles.right}>
          <Text style={[styles.status, { color: onTrack ? colors.tertiary : colors.alert }]}>
            {onTrack ? 'ON TRACK' : 'OVER TARGET'}
          </Text>
          <Icon name="keyboard_arrow_down" size={20} color={colors.onSurfaceVariant} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
  },
  strip: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainer,
    boxShadow: shadows.level1,
  },
  left: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
  },
  figures: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  projected: {
    flexShrink: 1,
    ...typography.labelMd,
    color: colors.onSurface,
  },
  projectedAmount: {
    fontFamily: fontFamilies.mono.bold,
    color: colors.primary,
  },
  dot: {
    color: colors.outline,
  },
  target: {
    flexShrink: 1,
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  status: {
    ...typography.labelSm,
    letterSpacing: 0.6,
  },
});
