import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Polygon } from 'react-native-svg';

import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import type { PlanStatus } from '@/types/energy';
import { formatPeso } from '@/utils/format';

export type ReceiptProps = {
  /** Drives the stamp under the header. */
  status: PlanStatus;
  projectedBill: number;
  currentEstimate: number;
  target: number;
};

const STAMP: Record<PlanStatus, { label: string; color: string }> = {
  feasible: { label: 'TARGET FEASIBLE', color: colors.tertiary },
  'not-reachable': { label: 'TARGET NOT REACHABLE', color: colors.error },
};

const TOOTH_WIDTH = 6;
const TOOTH_DEPTH = 4;
const LEADER = '. . . . . .';

/** Compact plan receipt: the estimate, the target, the projected bill and whether the target is met. */
export function Receipt({ status, projectedBill, currentEstimate, target }: ReceiptProps) {
  const stamp = STAMP[status];
  return (
    <View style={styles.wrapper}>
      <View style={styles.paper}>
        <View style={styles.stampRow}>
          <View style={[styles.stamp, { borderColor: stamp.color }]}>
            <Text style={[styles.stampText, { color: stamp.color }]}>{stamp.label}</Text>
          </View>
        </View>

        <View style={styles.summary}>
          <LeaderRow label="Current estimate" value={formatPeso(currentEstimate)} valueStyle={styles.summaryValue} />
          <LeaderRow label="Your target" value={formatPeso(target)} valueStyle={styles.targetValue} />
        </View>

        <DashedRule />

        <View style={styles.projectedRow}>
          <Text style={styles.projectedLabel}>PROJECTED BILL</Text>
          <Text style={styles.projectedValue}>{formatPeso(projectedBill)}</Text>
        </View>
      </View>
      <SawtoothEdge />
    </View>
  );
}

export function LeaderRow({
  label,
  value,
  labelStyle,
  leaderStyle,
  valueStyle,
}: {
  label: string;
  value: string;
  labelStyle?: object;
  leaderStyle?: object;
  valueStyle?: object;
}) {
  return (
    <View style={styles.leaderRow}>
      <Text style={[styles.leaderLabel, labelStyle]}>{label}</Text>
      <Text style={[styles.leader, leaderStyle]}>{LEADER}</Text>
      <Text style={[styles.summaryValue, valueStyle]}>{value}</Text>
    </View>
  );
}

export function DashedRule() {
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

/** Torn-paper bottom edge: teeth hanging under the receipt body, in the paper's color. */
export function SawtoothEdge({ color = colors.surfaceContainerLowest }: { color?: string }) {
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
          <Polygon points={points.join(' ')} fill={color} />
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
    paddingTop: spacing.xs,
    paddingHorizontal: 20,
    paddingBottom: 20,
    boxShadow: shadows.receipt,
  },
  sawtooth: {
    height: TOOTH_DEPTH,
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
});
