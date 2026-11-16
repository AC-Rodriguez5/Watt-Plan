import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { SawtoothEdge } from '@/components/receipt';
import { colors, fontFamilies, radii, shadows, spacing, typography } from '@/constants/theme';
import type { PlanStatus } from '@/types/energy';
import { formatPeso, formatPesoCut } from '@/utils/format';

export type ChatReceiptProps = {
  title: string;
  /** Line under the title on the current receipt, e.g. "Changes only". */
  subtitle?: string;
  revisionNumber: number;
  /** Changed appliances, e.g. label "Aircon 6 h → 4 h a day" and the pesos it saves per month. */
  lines: { id: string; label: string; saving: number }[];
  /** Appliances the user asked to leave alone, e.g. label "Stand Fan 14 h a day", printed with "Kept". */
  kept: { id: string; label: string }[];
  status: PlanStatus;
  projectedBill: number;
  /** Pesos under the target (positive) or over it (negative). */
  margin: number;
};

type Variant = 'current' | 'earlier';

const STAMP: Record<PlanStatus, { label: string; icon: 'verified' | 'warning'; background: string; color: string }> = {
  feasible: { label: 'TARGET MET', icon: 'verified', background: colors.tertiaryFixed, color: colors.onTertiaryFixed },
  'not-reachable': { label: 'OVER TARGET', icon: 'warning', background: colors.errorContainer, color: colors.onErrorContainer },
};

const DOTS = '. '.repeat(60);

/** Compact receipt shown inside a plan chat message (design/screens/plan_chat.png). */
export function ChatReceipt(props: ChatReceiptProps & { variant: Variant }) {
  return props.variant === 'current' ? <CurrentReceipt {...props} /> : <EarlierReceipt {...props} />;
}

function CurrentReceipt({ title, subtitle, lines, kept, status, projectedBill, margin }: ChatReceiptProps) {
  const stamp = STAMP[status];
  const onTarget = margin >= 0;
  return (
    <View>
      <View style={styles.currentPaper}>
        <View style={styles.currentHeader}>
          <View style={styles.headerText}>
            <Text style={styles.currentTitle}>{title}</Text>
            {subtitle !== undefined && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          <View style={[styles.stamp, { backgroundColor: stamp.background }]}>
            <Icon name={stamp.icon} size={14} color={stamp.color} />
            <Text style={[styles.stampText, { color: stamp.color }]}>{stamp.label}</Text>
          </View>
        </View>

        <View style={styles.currentLines}>
          {lines.map((line) => (
            <View key={line.id} style={styles.row}>
              <Text style={styles.currentLabel}>{line.label}</Text>
              <Text style={styles.currentAmount}>{formatPesoCut(line.saving)}</Text>
            </View>
          ))}
          {kept.map((line) => (
            <View key={line.id} style={styles.row}>
              <View style={styles.keptLabel}>
                <Icon name="lock" size={14} color={colors.tertiary} />
                <Text style={styles.keptText}>{line.label}</Text>
              </View>
              <Text style={styles.keptText}>Kept</Text>
            </View>
          ))}
        </View>

        <Text style={styles.dots} numberOfLines={1}>
          {DOTS}
        </Text>

        <View style={styles.row}>
          <Text style={styles.projectedLabel}>PROJECTED BILL</Text>
          <View style={styles.projectedValue}>
            <Text style={styles.projectedAmount}>{formatPeso(projectedBill)}</Text>
            <View style={styles.marginRow}>
              <Icon name={onTarget ? 'savings' : 'warning'} size={12} color={onTarget ? colors.tertiary : colors.error} />
              <Text style={[styles.marginText, { color: onTarget ? colors.tertiary : colors.error }]}>
                {formatPeso(Math.abs(margin))} {onTarget ? 'below' : 'over'} target
              </Text>
            </View>
          </View>
        </View>
      </View>
      <SawtoothEdge color={colors.surface} />
    </View>
  );
}

function EarlierReceipt({ title, revisionNumber, lines, projectedBill }: ChatReceiptProps) {
  return (
    <View>
      <View style={styles.earlierPaper}>
        <View style={styles.earlierHeader}>
          <View style={styles.earlierTitle}>
            <Icon name="history" size={18} color={colors.secondary} />
            <Text style={styles.earlierTitleText}>{title}</Text>
          </View>
          <Text style={styles.revision}>REV {String(revisionNumber).padStart(2, '0')}</Text>
        </View>

        <View style={styles.earlierLines}>
          {lines.map((line) => (
            <View key={line.id} style={styles.row}>
              <Text style={styles.earlierLabel}>{line.label}</Text>
              <Text style={styles.earlierAmount}>{formatPesoCut(line.saving)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.earlierDashes} numberOfLines={1}>
          {'- '.repeat(60)}
        </Text>

        <View style={[styles.row, styles.earlierTotal]}>
          <Text style={styles.earlierProjectedLabel}>PROJECTED BILL</Text>
          <Text style={styles.earlierProjectedValue}>{formatPeso(projectedBill)}</Text>
        </View>
      </View>
      <SawtoothEdge color={colors.surfaceContainerLowest} />
    </View>
  );
}

const MONO_MEDIUM = fontFamilies.mono.medium;
const MONO_BOLD = fontFamilies.mono.bold;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },

  // Current receipt: sits on the white assistant bubble in the surface color.
  currentPaper: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  currentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  currentTitle: {
    ...typography.receiptLabel,
    fontFamily: MONO_BOLD,
    letterSpacing: 1.2,
    color: colors.primary,
  },
  subtitle: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  stamp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    transform: [{ rotate: '-3deg' }],
    boxShadow: shadows.level1,
  },
  stampText: {
    fontFamily: MONO_BOLD,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1,
  },
  currentLines: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  currentLabel: {
    flexShrink: 1,
    fontFamily: MONO_MEDIUM,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
  },
  // A cut is money saved, so it is green.
  currentAmount: {
    fontFamily: MONO_BOLD,
    fontSize: 14,
    lineHeight: 20,
    color: colors.tertiary,
  },
  keptLabel: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  keptText: {
    ...typography.receiptLabel,
    letterSpacing: 0,
    color: colors.tertiary,
  },
  dots: {
    marginVertical: spacing.sm,
    textAlign: 'center',
    fontFamily: MONO_MEDIUM,
    fontSize: 10,
    lineHeight: 14,
    color: colors.outlineVariant,
  },
  projectedLabel: {
    ...typography.receiptLabel,
    color: colors.onSurfaceVariant,
    alignSelf: 'flex-start',
    paddingTop: spacing.sm,
  },
  projectedValue: {
    alignItems: 'flex-end',
  },
  projectedAmount: {
    ...typography.receiptNumericLg,
    color: colors.primary,
  },
  marginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  marginText: {
    ...typography.labelSm,
  },

  // Earlier receipt: white paper, muted ink.
  earlierPaper: {
    padding: spacing.md,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLowest,
    boxShadow: shadows.level1,
  },
  earlierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  earlierTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  earlierTitleText: {
    ...typography.receiptLabel,
    color: colors.onSurfaceVariant,
  },
  revision: {
    ...typography.receiptLabel,
    color: colors.outline,
  },
  earlierLines: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  earlierLabel: {
    flexShrink: 1,
    fontFamily: MONO_MEDIUM,
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
  },
  earlierAmount: {
    fontFamily: MONO_MEDIUM,
    fontSize: 13,
    lineHeight: 18,
    color: colors.tertiary,
  },
  earlierDashes: {
    marginVertical: spacing.sm,
    fontFamily: MONO_MEDIUM,
    fontSize: 12,
    lineHeight: 16,
    color: colors.outlineVariant,
  },
  earlierTotal: {
    paddingTop: spacing.xs,
  },
  earlierProjectedLabel: {
    ...typography.receiptLabel,
    color: colors.onSurface,
  },
  earlierProjectedValue: {
    fontFamily: MONO_BOLD,
    fontSize: 16,
    lineHeight: 22,
    color: colors.onSurface,
  },
});
