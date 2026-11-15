import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import {
  Barcode,
  CATEGORY_CHIP,
  DashedRule,
  LeaderRow,
  SawtoothEdge,
  type ReceiptLineItem,
  type ReceiptProps,
} from '@/components/receipt';
import { colors, fontFamilies, radii, shadows, spacing, typography } from '@/constants/theme';
import { formatPeso, formatPesoCut } from '@/utils/format';

export type NotReachableReceiptProps = Pick<
  ReceiptProps,
  'items' | 'currentEstimate' | 'target' | 'totalCuts' | 'period' | 'barcodeNumber'
> & {
  /** Lowest bill the household can reach by making every cut it allows. */
  lowestBill: number;
  /** Pesos the lowest bill is still above the target. Computed by the optimizer. */
  gap: number;
};

/** In this state the luxury chip uses the error tint, as drawn in design/screens/plan_not_reachable.png. */
const CHIP_OVERRIDE: Partial<Record<ReceiptLineItem['category'], { background: string; color: string }>> = {
  luxury: { background: colors.errorContainer, color: colors.onErrorContainer },
};

/** "Your plan" receipt when the target cannot be reached (design/screens/plan_not_reachable.png). */
export function NotReachableReceipt({
  items,
  currentEstimate,
  target,
  totalCuts,
  lowestBill,
  gap,
  period,
  barcodeNumber,
}: NotReachableReceiptProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.paper}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Icon name="receipt_long" size={16} color={colors.primary} />
            <Text style={styles.title}>★ YOUR PLAN ★</Text>
          </View>
          <Text style={styles.subtitle}>WATT PLAN OPTIMIZER · {period}</Text>
          <View style={styles.stamp}>
            <Icon name="cancel" size={16} color={colors.error} />
            <Text style={styles.stampText}>TARGET NOT REACHABLE</Text>
          </View>
        </View>

        <DashedRule />

        <View style={styles.summary}>
          <LeaderRow label="Current estimate" value={formatPeso(currentEstimate)} valueStyle={styles.summaryValue} />
          <LeaderRow label="Your target" value={formatPeso(target)} valueStyle={styles.summaryValue} />
          <LeaderRow
            label="Lowest realistic bill"
            labelStyle={styles.lowestLabel}
            leaderStyle={styles.lowestLeader}
            value={formatPeso(lowestBill)}
            valueStyle={styles.lowestValue}
          />
        </View>

        <View style={styles.partition}>
          <View style={styles.partitionRule}>
            <DashedRule />
          </View>
          <Text style={styles.partitionLabel}>RECOMMENDED MAX CUTS</Text>
          <View style={styles.partitionRule}>
            <DashedRule />
          </View>
        </View>

        <View style={styles.items}>
          {items.map((item) => {
            const chip = { ...CATEGORY_CHIP[item.category], ...CHIP_OVERRIDE[item.category] };
            return (
              <View key={item.id} style={styles.item}>
                <View style={styles.itemText}>
                  <View style={styles.itemName}>
                    <View style={[styles.chip, { backgroundColor: chip.background }]}>
                      <Text style={[styles.chipText, { color: chip.color }]}>{chip.label}</Text>
                    </View>
                    <Text style={styles.itemNameText} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>
                  <Text style={styles.detail}>{item.detail}</Text>
                </View>
                <Text style={styles.cutValue}>{formatPesoCut(item.saving)}</Text>
              </View>
            );
          })}
        </View>

        <DashedRule />

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL CUTS</Text>
          <Text style={styles.cutValue}>{formatPesoCut(totalCuts)}</Text>
        </View>

        <View style={styles.highlight}>
          <Text style={styles.highlightLabel}>LOWEST ACHIEVABLE BILL</Text>
          <Text style={styles.highlightValue}>{formatPeso(lowestBill)}</Text>
          <Text style={styles.gapText}>Gap to target: +{formatPeso(gap)} unreachable without hardware upgrades</Text>
        </View>

        <Barcode number={barcodeNumber} />
      </View>
      <SawtoothEdge />
    </View>
  );
}

const MONO_BOLD = fontFamilies.mono.bold;

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    maxWidth: 340,
    alignSelf: 'center',
  },
  paper: {
    backgroundColor: colors.surfaceContainerLowest,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 24,
    boxShadow: shadows.receipt,
  },

  // Header
  header: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    ...typography.receiptLabel,
    fontFamily: MONO_BOLD,
    fontSize: 13,
    letterSpacing: 2.6,
    color: colors.onSurface,
  },
  subtitle: {
    ...typography.receiptLabel,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  stamp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: spacing.xs,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: `${colors.error}CC`,
    borderRadius: radii.sm,
    backgroundColor: `${colors.errorContainer}4D`,
    transform: [{ rotate: '-2deg' }],
  },
  stampText: {
    ...typography.receiptLabel,
    fontFamily: MONO_BOLD,
    fontSize: 11,
    color: colors.error,
  },

  // Summary
  summary: {
    gap: spacing.sm,
    paddingVertical: 12,
  },
  summaryValue: {
    ...typography.receiptNumericMd,
    color: colors.onSurface,
  },
  lowestLabel: {
    fontFamily: fontFamilies.mono.bold,
    color: colors.error,
  },
  lowestLeader: {
    color: `${colors.error}80`,
  },
  lowestValue: {
    ...typography.receiptNumericMd,
    fontFamily: MONO_BOLD,
    color: colors.error,
  },

  // "Recommended max cuts" partition
  partition: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  partitionRule: {
    flex: 1,
  },
  partitionLabel: {
    ...typography.receiptLabel,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.onSurfaceVariant,
  },

  // Cuts
  items: {
    gap: 12,
    paddingVertical: spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  itemText: {
    flexShrink: 1,
    gap: 2,
  },
  itemName: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  chipText: {
    fontFamily: MONO_BOLD,
    fontSize: 10,
    lineHeight: 14,
  },
  itemNameText: {
    ...typography.bodyMd,
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
  },
  detail: {
    ...typography.receiptLabel,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  cutValue: {
    ...typography.receiptNumericMd,
    fontFamily: MONO_BOLD,
    fontSize: 15,
    color: colors.error,
  },

  // Totals
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  totalLabel: {
    ...typography.receiptLabel,
    fontFamily: MONO_BOLD,
    color: colors.onSurface,
  },
  highlight: {
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 12,
    padding: 12,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainer,
  },
  highlightLabel: {
    ...typography.receiptLabel,
    fontSize: 11,
    letterSpacing: 1.1,
    color: colors.onSurfaceVariant,
  },
  highlightValue: {
    ...typography.receiptNumericLg,
    fontSize: 28,
    lineHeight: 32,
    color: colors.error,
  },
  gapText: {
    ...typography.receiptLabel,
    fontFamily: MONO_BOLD,
    fontSize: 11,
    textAlign: 'center',
    color: colors.error,
  },
});
