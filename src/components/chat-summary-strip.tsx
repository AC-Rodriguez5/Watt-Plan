import { Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { colors, fontFamilies, radii, shadows, spacing, typography, themedStyles } from '@/constants/theme';
import type { Plan } from '@/types/energy';
import { formatPeso } from '@/utils/format';

/**
 * Pinned "₱1,985 of ₱2,000 target · ON TRACK" pill at the top of Plan chat. Reads the shared plan.
 * Numbers come first, so a narrow screen cuts the words, never the figures.
 */
export function ChatSummaryStrip({ plan }: { plan: Plan }) {
  const onTrack = plan.status === 'feasible';
  const projected = formatPeso(plan.projectedBill);
  const target = formatPeso(plan.target);
  const status = onTrack ? 'ON TRACK' : 'OVER TARGET';

  return (
    <View style={styles.wrapper}>
      <View
        style={styles.strip}
        accessible
        accessibilityLabel={`Projected bill ${projected}, target ${target}, ${onTrack ? 'on track' : 'over target'}`}>
        <View style={[styles.badge, { backgroundColor: onTrack ? colors.tertiaryContainer : colors.error }]}>
          <Icon name={onTrack ? 'check' : 'priority_high'} size={16} color={onTrack ? colors.onTertiaryContainer : colors.onError} />
        </View>
        <Text style={styles.figures} numberOfLines={1}>
          <Text style={styles.projected}>{projected}</Text>
          <Text style={styles.of}> of {target} target</Text>
        </Text>
        <Text style={[styles.status, { color: onTrack ? colors.tertiary : colors.error }]}>{status}</Text>
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  wrapper: {
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
  },
  strip: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainer,
    boxShadow: shadows.level1,
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
  },
  projected: {
    ...typography.labelMd,
    fontFamily: fontFamilies.mono.bold,
    color: colors.primary,
  },
  of: {
    ...typography.labelMd,
    fontFamily: fontFamilies.inter.medium,
    color: colors.onSurfaceVariant,
  },
  status: {
    ...typography.labelSm,
    fontFamily: fontFamilies.inter.semiBold,
    letterSpacing: 0.6,
  },
}));
