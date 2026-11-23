import { router, type Href } from 'expo-router';
import type { AndroidSymbol } from 'expo-symbols';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { EnergyTrack } from '@/components/home-dashboard';
import { Icon } from '@/components/icon';
import { colors, fontFamilies, radii, shadows, spacing, themedStyles, typography } from '@/constants/theme';
import type { BillSlice, HomeSummary } from '@/optimizer/home-summary';
import type { BillSettings } from '@/types/energy';
import { billingDay, formatPeriod } from '@/utils/billing-period';
import { formatPeso, formatWhole } from '@/utils/format';

/**
 * The two other Home layouts, picked in the Display sheet (Home's ⋮ button). Layout A, "Bill at a
 * glance", is HomeDashboard in home-dashboard.tsx. Every figure comes from the optimizer's HomeSummary.
 */

type LayoutProps = {
  summary: HomeSummary;
  bill: BillSettings;
};

/** A share as a whole percent for labels: 0.565 -> "57%". */
const percent = (share: number) => `${Math.round(share * 100)}%`;

// ---------------------------------------------------------------------------
// B · Where it goes
// ---------------------------------------------------------------------------

/** "Where it goes": a ring of what each appliance costs, three small figures, and the target. */
export function BreakdownDashboard({ summary, bill }: LayoutProps) {
  const { estimatedBill, slices, kwh, co2Kg, ratePerKwh } = summary;
  const sliceColors = sliceColorsFor(slices);

  return (
    <View style={styles.stack}>
      <View style={styles.card}>
        <PeriodLine bill={bill} />
        <BillRing slices={slices} colors={sliceColors} total={estimatedBill} />
        <View style={styles.legend}>
          {slices.map((slice, index) => (
            <View key={slice.applianceId ?? 'others'} style={styles.legendChip}>
              <View style={[styles.legendDot, { backgroundColor: sliceColors[index] }]} />
              <Text style={styles.legendText} numberOfLines={1}>
                {`${slice.label} ${percent(slice.share)}`}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.tiles}>
        <StatTile value={formatWhole(kwh)} unit="kWh a month" />
        <StatTile value={formatWhole(co2Kg)} unit="kg CO₂" />
        <StatTile value={`₱${ratePerKwh.toFixed(2)}`} unit="per kWh" />
      </View>

      <TargetLine summary={summary} />
      <MakePlanButton />
    </View>
  );
}

/** Light-to-strong slice colors: the costliest is the strongest blue; "Others" is grey. */
function sliceColorsFor(slices: BillSlice[]): string[] {
  const named = [colors.primaryContainer, colors.secondary, colors.tertiaryContainer];
  return slices.map((slice, index) => (slice.applianceId === null ? colors.outline : named[index % named.length]));
}

const RING_SIZE = 184;
const RING_STROKE = 22;
/** Gap between slices, in pixels along the ring. */
const RING_GAP = 3;

function BillRing({ slices, colors: sliceColors, total }: { slices: BillSlice[]; colors: string[]; total: number }) {
  const radius = (RING_SIZE - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const gap = slices.length > 1 ? RING_GAP : 0;
  // Where each slice starts along the ring: the lengths of the slices before it.
  const starts = slices.map((_, index) =>
    slices.slice(0, index).reduce((sum, slice) => sum + slice.share * circumference, 0),
  );
  const label = `Where your bill goes: ${slices.map((slice) => `${slice.label} ${percent(slice.share)}`).join(', ')}`;

  return (
    <View style={styles.ringWrap} accessible accessibilityLabel={label}>
      <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ringSvg}>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={radius}
          stroke={colors.surfaceContainerHigh}
          strokeWidth={RING_STROKE}
          fill="none"
        />
        {slices.map((slice, index) => {
          const length = Math.max(0, slice.share * circumference - gap);
          const offset = -starts[index];
          return (
            <Circle
              key={slice.applianceId ?? 'others'}
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={radius}
              stroke={sliceColors[index]}
              strokeWidth={RING_STROKE}
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={offset}
              fill="none"
            />
          );
        })}
      </Svg>
      <View style={styles.ringCenter} pointerEvents="none">
        <Text style={styles.ringAmount}>{formatPeso(total)}</Text>
        <Text style={styles.ringCaption}>this month</Text>
      </View>
    </View>
  );
}

function StatTile({ value, unit }: { value: string; unit: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.tileUnit}>{unit}</Text>
    </View>
  );
}

/** "Target ₱2,000" with how much to cut (red) or how much room is left (green), or a way to set one. */
function TargetLine({ summary }: { summary: HomeSummary }) {
  const { target, isOverTarget, excess, headroom } = summary;
  if (target === null) return <SetTargetButton />;
  return (
    <View style={styles.targetLine}>
      <Text style={styles.targetText}>
        Target <Text style={styles.targetAmount}>{formatPeso(target)}</Text>
      </Text>
      <View style={[styles.chip, isOverTarget ? styles.chipOver : styles.chipUnder]}>
        <Text style={[styles.chipText, { color: isOverTarget ? colors.onErrorContainer : colors.tertiary }]}>
          {isOverTarget ? `${formatPeso(excess)} to cut` : headroom > 0 ? `${formatPeso(headroom)} under` : 'On target'}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// C · Bill journey
// ---------------------------------------------------------------------------

/** "Bill journey": from today's bill to the target, one button, and four shortcuts with a figure each. */
export function JourneyDashboard({ summary, bill }: LayoutProps) {
  const { estimatedBill, target, targetProgress, isOverTarget, excess, headroom, applianceCount, ratePerKwh, topCosts, slices } =
    summary;
  const biggest = topCosts[0];
  const biggestShare = slices.find((slice) => slice.applianceId === biggest?.appliance.id)?.share;

  return (
    <View style={styles.stack}>
      <View style={styles.card}>
        <PeriodLine bill={bill} />
        <View style={styles.journeyEnds}>
          <View>
            <Text style={styles.endLabel}>Now</Text>
            <Text style={styles.endAmount}>{formatPeso(estimatedBill)}</Text>
          </View>
          {target !== null && (
            <View style={styles.endRight}>
              <Text style={styles.endLabel}>Target</Text>
              <Text style={[styles.endAmount, styles.endTarget]}>{formatPeso(target)}</Text>
            </View>
          )}
        </View>

        {target === null ? (
          <SetTargetButton />
        ) : (
          <>
            <EnergyTrack goalFlex={targetProgress} excessFlex={0} emptyFlex={1 - targetProgress} />
            <Text style={[styles.journeyCaption, !isOverTarget && styles.journeyCaptionDone]}>
              {isOverTarget
                ? `Cut ${formatPeso(excess)} to get there`
                : headroom > 0
                  ? `${formatPeso(headroom)} under your target`
                  : 'Right on your target'}
            </Text>
          </>
        )}
      </View>

      <MakePlanButton />

      <View style={styles.grid}>
        <Shortcut icon="devices" title="Appliances" detail={`${applianceCount} · ${formatPeso(estimatedBill)}`} to="/appliances" />
        <Shortcut icon="receipt_long" title="Bill" detail={`₱${ratePerKwh.toFixed(2)} / kWh`} to="/bill-settings" />
        {biggest && (
          <Shortcut
            icon="local_fire_department"
            title="Biggest"
            detail={biggestShare === undefined ? biggest.appliance.name : `${biggest.appliance.name} ${percent(biggestShare)}`}
            to="/appliances"
          />
        )}
        <Shortcut icon="chat" title="Ask" detail="Change the plan" to="/plan-chat" />
      </View>
    </View>
  );
}

function Shortcut({ icon, title, detail, to }: { icon: AndroidSymbol; title: string; detail: string; to: Href }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${detail}`}
      onPress={() => router.navigate(to)}
      style={({ pressed }) => [styles.shortcut, pressed && styles.shortcutPressed]}>
      <Icon name={icon} size={22} color={colors.primary} />
      <Text style={styles.shortcutTitle}>{title}</Text>
      <Text style={styles.shortcutDetail} numberOfLines={1}>
        {detail}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

function PeriodLine({ bill }: { bill: BillSettings }) {
  const period = formatPeriod(bill.periodStart, bill.periodEnd);
  const day = billingDay(bill.periodStart, bill.periodEnd);
  if (period === '') return null;
  return (
    <View style={styles.periodRow}>
      <Icon name="calendar_today" size={16} color={colors.onSurfaceVariant} />
      <Text style={styles.period}>
        {period}
        {day !== null && ` · Day ${day}`}
      </Text>
    </View>
  );
}

function MakePlanButton() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Make a plan"
      onPress={() => router.navigate('/plan')}
      style={({ pressed }) => [styles.planButton, pressed && styles.planButtonPressed]}>
      <Icon name="receipt_long" size={22} color={colors.onPrimary} />
      <Text style={styles.planButtonLabel}>Make a plan</Text>
    </Pressable>
  );
}

function SetTargetButton() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Set a target"
      onPress={() => router.push('/target-edit')}
      style={({ pressed }) => [styles.setTarget, pressed && styles.setTargetPressed]}>
      <Icon name="flag" size={18} color={colors.primary} />
      <Text style={styles.setTargetLabel}>Set a target</Text>
    </Pressable>
  );
}

const styles = themedStyles(() => ({
  // Groups sit 24 apart; items inside a group 8 to 12.
  stack: {
    gap: spacing.lg,
  },
  card: {
    gap: 12,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLowest,
    boxShadow: shadows.level2,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  period: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },

  // B: ring
  ringWrap: {
    alignSelf: 'center',
    width: RING_SIZE,
    height: RING_SIZE,
    marginVertical: spacing.sm,
  },
  // Starts the first slice at 12 o'clock.
  ringSvg: {
    transform: [{ rotate: '-90deg' }],
  },
  ringCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringAmount: {
    ...typography.receiptNumericLg,
    color: colors.onSurface,
  },
  ringCaption: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  legendChip: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainerLow,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: radii.full,
  },
  legendText: {
    ...typography.labelMd,
    flexShrink: 1,
    color: colors.onSurface,
  },
  tiles: {
    flexDirection: 'row',
    gap: 12,
  },
  tile: {
    flex: 1,
    minWidth: 0,
    padding: 12,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLowest,
    boxShadow: shadows.level1,
  },
  tileValue: {
    ...typography.receiptNumericMd,
    fontFamily: fontFamilies.mono.bold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.onSurface,
  },
  tileUnit: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  targetLine: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLow,
  },
  targetText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  targetAmount: {
    fontFamily: fontFamilies.mono.bold,
    color: colors.onSurface,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  chipOver: {
    backgroundColor: colors.errorContainer,
  },
  chipUnder: {
    backgroundColor: `${colors.tertiaryContainer}26`,
  },
  chipText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.mono.bold,
  },

  // C: journey
  journeyEnds: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  endRight: {
    alignItems: 'flex-end',
  },
  endLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  endAmount: {
    ...typography.receiptNumericLg,
    fontSize: 28,
    lineHeight: 34,
    color: colors.onSurface,
  },
  endTarget: {
    color: colors.primary,
  },
  journeyCaption: {
    ...typography.labelMd,
    textAlign: 'center',
    color: colors.error,
  },
  journeyCaptionDone: {
    color: colors.tertiary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  shortcut: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 88,
    gap: 2,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLowest,
    boxShadow: shadows.level1,
  },
  shortcutPressed: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  shortcutTitle: {
    ...typography.bodyMd,
    marginTop: spacing.xs,
    color: colors.onSurface,
  },
  shortcutDetail: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },

  // Shared
  planButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.primaryContainer,
    boxShadow: shadows.level2,
  },
  planButtonPressed: {
    backgroundColor: colors.primary,
  },
  planButtonLabel: {
    ...typography.titleMd,
    color: colors.onPrimary,
  },
  setTarget: {
    alignSelf: 'flex-start',
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainer,
  },
  setTargetPressed: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  setTargetLabel: {
    ...typography.labelMd,
    color: colors.primary,
  },
}));
