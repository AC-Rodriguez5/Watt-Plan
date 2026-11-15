import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Polygon } from 'react-native-svg';

import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { formatPeso, formatPesoCut } from '@/utils/format';

export type ReceiptCategory = 'essential' | 'flexible' | 'luxury';

export type ReceiptLineItem = {
  id: string;
  category: ReceiptCategory;
  name: string;
  /** Pesos saved per month, as a positive number. */
  saving: number;
  /** Second line, e.g. "6.0 h → 4.5 h daily". */
  detail: string;
  /** Change shown in red on the second line, e.g. "(-1.5 h)". */
  change: string;
};

export type ReceiptProps = {
  /** Recommended cuts, in display order. */
  items: ReceiptLineItem[];
  projectedBill: number;
  currentEstimate: number;
  target: number;
  /** Sum of all item savings. Computed by the optimizer, not here. */
  totalCuts: number;
  /** Header line, e.g. "OCT 2024". */
  period: string;
  /** Header line, e.g. "PH-MNL-7749-X". */
  termId: string;
  /** Digits printed under the barcode, e.g. "0924 8831 2000". */
  barcodeNumber: string;
};

const CATEGORY_CHIP: Record<ReceiptCategory, { label: string; background: string; color: string }> = {
  luxury: { label: 'LUX', background: colors.alertContainer, color: colors.alert },
  essential: { label: 'ESS', background: colors.surfaceContainer, color: colors.onSurfaceVariant },
  flexible: { label: 'FLX', background: colors.secondaryFixed, color: colors.onSecondaryFixedVariant },
};

const TOOTH_WIDTH = 6;
const TOOTH_DEPTH = 4;
const BARCODE_BARS = [4, 2, 6, 2, 8, 2, 4, 8, 2, 4, 2, 8, 4, 2, 6, 2, 4, 8];
const LEADER = '. . . . . .';

export function Receipt({
  items,
  projectedBill,
  currentEstimate,
  target,
  totalCuts,
  period,
  termId,
  barcodeNumber,
}: ReceiptProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.paper}>
        <View style={styles.header}>
          <Text style={styles.title}>★ YOUR PLAN ★</Text>
          <Text style={styles.subtitle}>WATT PLAN OPTIMIZER · {period}</Text>
          <Text style={styles.termId}>TERM-ID: {termId}</Text>
        </View>

        <View style={styles.stampRow}>
          <View style={styles.stamp}>
            <Text style={styles.stampText}>TARGET FEASIBLE</Text>
          </View>
        </View>

        <View style={styles.summary}>
          <LeaderRow label="Current estimate" value={formatPeso(currentEstimate)} valueStyle={styles.summaryValue} />
          <LeaderRow label="Your target" value={formatPeso(target)} valueStyle={styles.targetValue} />
        </View>

        <DashedRule />

        <Text style={styles.sectionHeader}>RECOMMENDED CUTS</Text>

        <View style={styles.items}>
          {items.map((item) => {
            const chip = CATEGORY_CHIP[item.category];
            return (
              <View key={item.id} style={styles.item}>
                <View style={styles.itemTop}>
                  <View style={styles.itemName}>
                    <View style={[styles.chip, { backgroundColor: chip.background }]}>
                      <Text style={[styles.chipText, { color: chip.color }]}>{chip.label}</Text>
                    </View>
                    <Text style={styles.itemNameText} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>
                  <Text style={styles.cutValue}>{formatPesoCut(item.saving)}</Text>
                </View>
                <View style={styles.itemBottom}>
                  <Text style={styles.detail}>{item.detail}</Text>
                  <Text style={styles.change}>{item.change}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <DashedRule />

        <View style={styles.totals}>
          <LeaderRow label="TOTAL CUTS" labelStyle={styles.totalLabel} value={formatPesoCut(totalCuts)} valueStyle={styles.cutValue} />
          <View style={styles.projectedRow}>
            <Text style={styles.projectedLabel}>PROJECTED BILL</Text>
            <Text style={styles.projectedValue}>{formatPeso(projectedBill)}</Text>
          </View>
          <View style={styles.savingsRow}>
            <Text style={styles.detail}>Est. savings</Text>
            <Text style={styles.savingsValue}>{formatPesoCut(totalCuts)} / mo</Text>
          </View>
        </View>

        <View style={styles.barcode}>
          <View style={styles.bars}>
            {BARCODE_BARS.map((width, index) => (
              <View key={index} style={{ width, backgroundColor: colors.onSurface }} />
            ))}
          </View>
          <Text style={styles.barcodeNumber}>{barcodeNumber}</Text>
        </View>
      </View>
      <SawtoothEdge />
    </View>
  );
}

function LeaderRow({
  label,
  value,
  labelStyle,
  valueStyle,
}: {
  label: string;
  value: string;
  labelStyle?: object;
  valueStyle?: object;
}) {
  return (
    <View style={styles.leaderRow}>
      <Text style={[styles.leaderLabel, labelStyle]}>{label}</Text>
      <Text style={styles.leader}>{LEADER}</Text>
      <Text style={[styles.summaryValue, valueStyle]}>{value}</Text>
    </View>
  );
}

function DashedRule() {
  const [width, setWidth] = useState(0);
  return (
    <View
      style={styles.rule}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 && (
        <Svg width={width} height={2}>
          <Line x1={0} y1={1} x2={width} y2={1} stroke={colors.outlineVariant} strokeWidth={2} strokeDasharray="6 4" />
        </Svg>
      )}
    </View>
  );
}

/** Torn-paper bottom edge: white teeth hanging under the receipt body. */
function SawtoothEdge() {
  const [width, setWidth] = useState(0);
  const count = Math.max(1, Math.round(width / TOOTH_WIDTH));
  const tooth = width / count;
  const points = [`0,0`, `${width},0`];
  for (let i = count; i > 0; i--) {
    points.push(`${i * tooth - tooth / 2},${TOOTH_DEPTH}`, `${(i - 1) * tooth},0`);
  }
  return (
    <View onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)} style={styles.sawtooth}>
      {width > 0 && (
        <Svg width={width} height={TOOTH_DEPTH}>
          <Polygon points={points.join(' ')} fill={colors.surfaceContainerLowest} />
        </Svg>
      )}
    </View>
  );
}

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
  sawtooth: {
    height: TOOTH_DEPTH,
  },
  header: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    ...typography.receiptLabel,
    fontFamily: typography.receiptNumericLg.fontFamily,
    fontSize: 13,
    letterSpacing: 2.6,
    color: colors.onSurface,
  },
  subtitle: {
    ...typography.receiptLabel,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  termId: {
    ...typography.receiptLabel,
    fontSize: 9,
    letterSpacing: 1.2,
    color: colors.outline,
  },
  stampRow: {
    alignItems: 'center',
    marginVertical: 12,
  },
  stamp: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: colors.tertiary,
    borderRadius: radii.sm,
    transform: [{ rotate: '-3deg' }],
  },
  stampText: {
    ...typography.receiptLabel,
    fontFamily: typography.receiptNumericLg.fontFamily,
    fontSize: 11,
    letterSpacing: 1.1,
    color: colors.tertiary,
  },
  summary: {
    gap: spacing.xs,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  leaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  leaderLabel: {
    ...typography.receiptLabel,
    color: colors.onSurfaceVariant,
  },
  leader: {
    ...typography.receiptLabel,
    color: colors.outline,
  },
  summaryValue: {
    ...typography.receiptLabel,
    color: colors.onSurface,
  },
  targetValue: {
    ...typography.receiptLabel,
    fontFamily: typography.receiptNumericLg.fontFamily,
    color: colors.primary,
  },
  rule: {
    height: 2,
    marginVertical: spacing.sm,
    overflow: 'hidden',
  },
  sectionHeader: {
    ...typography.receiptLabel,
    fontFamily: typography.receiptNumericLg.fontFamily,
    fontSize: 11,
    color: colors.onSurface,
    paddingVertical: spacing.xs,
  },
  items: {
    gap: 10,
    paddingVertical: spacing.xs,
  },
  item: {
    gap: 2,
  },
  itemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  chip: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.sm,
  },
  chipText: {
    fontFamily: typography.receiptNumericLg.fontFamily,
    fontSize: 10,
    lineHeight: 14,
  },
  itemNameText: {
    ...typography.receiptLabel,
    color: colors.onSurface,
    flexShrink: 1,
  },
  cutValue: {
    ...typography.receiptNumericMd,
    fontFamily: typography.receiptNumericLg.fontFamily,
    color: colors.tertiary,
  },
  itemBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 24,
  },
  detail: {
    ...typography.receiptLabel,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  change: {
    ...typography.receiptLabel,
    fontSize: 11,
    color: colors.error,
  },
  totals: {
    gap: spacing.xs,
    paddingTop: spacing.xs,
    paddingBottom: 12,
  },
  totalLabel: {
    fontFamily: typography.receiptNumericLg.fontFamily,
  },
  projectedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: spacing.xs,
  },
  projectedLabel: {
    ...typography.receiptLabel,
    fontFamily: typography.receiptNumericLg.fontFamily,
    fontSize: 13,
    color: colors.onSurface,
  },
  projectedValue: {
    ...typography.receiptNumericLg,
    color: colors.primary,
  },
  savingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  savingsValue: {
    ...typography.receiptLabel,
    fontSize: 11,
    fontFamily: typography.receiptNumericLg.fontFamily,
    color: colors.tertiary,
  },
  barcode: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    opacity: 0.7,
  },
  bars: {
    width: 192,
    height: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  barcodeNumber: {
    ...typography.receiptLabel,
    fontSize: 9,
    letterSpacing: 1.8,
    marginTop: spacing.xs,
    color: colors.onSurfaceVariant,
  },
});
