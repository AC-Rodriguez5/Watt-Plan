import { router } from 'expo-router';
import type { AndroidSymbol } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Icon } from '@/components/icon';
import { categoryColors, colors, fontFamilies, radii, shadows, spacing, typography } from '@/constants/theme';
import type { CostlyAppliance, HomeSummary } from '@/optimizer/home-summary';
import type { BillSettings } from '@/types/energy';
import { applianceIcon } from '@/utils/appliance-icon';
import { billingDay, formatPeriod } from '@/utils/billing-period';
import { formatPeso, splitPeso } from '@/utils/format';

type HomeDashboardProps = {
  summary: HomeSummary;
  bill: BillSettings;
};

const QUICK_ACTIONS: { label: string; accessibilityLabel: string; icon: AndroidSymbol; open: () => void }[] = [
  { label: 'Add', accessibilityLabel: 'Add appliance', icon: 'add', open: () => router.push('/appliance-add') },
  { label: 'Bill', accessibilityLabel: 'Enter bill', icon: 'electric_meter', open: () => router.push('/bill-settings') },
  { label: 'Plan', accessibilityLabel: 'Open plan', icon: 'receipt_long', open: () => router.navigate('/plan') },
  { label: 'Ask', accessibilityLabel: 'Ask the assistant', icon: 'chat', open: () => router.push('/plan-chat') },
];

/**
 * Home tab once appliances and a last bill exist. "Bill at a glance": the estimated bill and how far it
 * is from the target, four shortcuts, then the appliances costing the most.
 */
export function HomeDashboard({ summary, bill }: HomeDashboardProps) {
  return (
    <View style={styles.stack}>
      <BillCard summary={summary} bill={bill} />
      <QuickActions />
      <TopSpenders summary={summary} />
    </View>
  );
}

function BillCard({ summary, bill }: HomeDashboardProps) {
  const { estimatedBill, target, isOverTarget, excess, headroom, barFill, goalShare } = summary;
  const amount = splitPeso(estimatedBill);
  const period = formatPeriod(bill.periodStart, bill.periodEnd);
  const day = billingDay(bill.periodStart, bill.periodEnd);
  const goalFlex = barFill * goalShare;
  const excessFlex = barFill - goalFlex;
  const emptyFlex = 1 - barFill;

  return (
    <View style={styles.billCard}>
      {period !== '' && (
        <View style={styles.periodRow}>
          <Icon name="calendar_today" size={16} color={colors.onSurfaceVariant} />
          <Text style={styles.period}>
            {period}
            {day !== null && ` · Day ${day}`}
          </Text>
        </View>
      )}

      <View>
        <Text style={styles.billLabel}>Estimated bill</Text>
        <View style={styles.amountRow}>
          <Text style={styles.amount}>{amount.whole}</Text>
          <Text style={styles.cents}>.{amount.cents}</Text>
        </View>
      </View>

      {target === null ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Set a target"
          onPress={() => router.push('/target-edit')}
          style={({ pressed }) => [styles.setTarget, pressed && styles.setTargetPressed]}>
          <Icon name="flag" size={18} color={colors.primary} />
          <Text style={styles.setTargetLabel}>Set a target</Text>
        </Pressable>
      ) : (
        <>
          <View style={styles.statusRow}>
            <View style={[styles.chip, isOverTarget ? styles.chipOver : styles.chipUnder]}>
              <Icon
                name={isOverTarget ? 'trending_up' : 'check'}
                size={14}
                color={isOverTarget ? colors.onErrorContainer : colors.tertiary}
              />
              <Text style={[styles.chipText, { color: isOverTarget ? colors.onErrorContainer : colors.tertiary }]}>
                {isOverTarget ? `${formatPeso(excess)} over` : headroom > 0 ? `${formatPeso(headroom)} under` : 'On target'}
              </Text>
            </View>
            <Text style={styles.target}>Target {formatPeso(target)}</Text>
          </View>

          <EnergyTrack goalFlex={goalFlex} excessFlex={excessFlex} emptyFlex={emptyFlex} />
        </>
      )}
    </View>
  );
}

const TRACK_HEIGHT = 12;
const BOLT_SIZE = 26;
const PULSE_WIDTH = 80;
const PULSE_MS = 1600;
const PULSE_PAUSE_MS = 500;

/**
 * The goal/excess bar with a bolt marking the target and a pulse of light running left to right
 * through the filled part, like current along a wire. The pulse stops when the phone asks for
 * reduced motion.
 */
function EnergyTrack({ goalFlex, excessFlex, emptyFlex }: { goalFlex: number; excessFlex: number; emptyFlex: number }) {
  const [width, setWidth] = useState(0);
  const [progress] = useState(() => new Animated.Value(0));
  const fillFlex = goalFlex + excessFlex;
  const fillWidth = width * fillFlex;

  useEffect(() => {
    if (fillWidth <= 0) return;
    let loop: Animated.CompositeAnimation | null = null;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduceMotion) => {
        if (cancelled || reduceMotion) return;
        progress.setValue(0);
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(progress, {
              toValue: 1,
              duration: PULSE_MS,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.delay(PULSE_PAUSE_MS),
          ]),
        );
        loop.start();
      });
    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [fillWidth, progress]);

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-PULSE_WIDTH, fillWidth] });
  // The bolt sits where blue meets red: the target. Under target, that is the end of the blue.
  const boltLeft = Math.min(Math.max(width * goalFlex - BOLT_SIZE / 2, 0), Math.max(width - BOLT_SIZE, 0));

  return (
    <View style={styles.trackArea} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <View style={styles.track}>
        {fillFlex > 0 && (
          <View style={[styles.fill, { flex: fillFlex }]}>
            {goalFlex > 0 && <View style={[styles.goalFill, { flex: goalFlex }]} />}
            {excessFlex > 0 && <View style={[styles.excessFill, { flex: excessFlex }]} />}
            {fillWidth > 0 && (
              <Animated.View pointerEvents="none" style={[styles.pulse, { transform: [{ translateX }] }]}>
                <Svg width={PULSE_WIDTH} height={TRACK_HEIGHT}>
                  <Defs>
                    <LinearGradient id="current" x1="0" y1="0" x2="1" y2="0">
                      <Stop offset="0" stopColor={colors.primaryFixed} stopOpacity={0} />
                      <Stop offset="0.5" stopColor={colors.primaryFixed} stopOpacity={0.95} />
                      <Stop offset="1" stopColor={colors.primaryFixed} stopOpacity={0} />
                    </LinearGradient>
                  </Defs>
                  <Rect x="0" y="0" width={PULSE_WIDTH} height={TRACK_HEIGHT} fill="url(#current)" />
                </Svg>
              </Animated.View>
            )}
          </View>
        )}
        {emptyFlex > 0 && <View style={{ flex: emptyFlex }} />}
      </View>
      {width > 0 && goalFlex > 0 && (
        <View style={[styles.bolt, { left: boltLeft }]} pointerEvents="none">
          <Icon name="bolt" size={16} color={colors.primary} />
        </View>
      )}
    </View>
  );
}

function QuickActions() {
  return (
    <View style={styles.actions}>
      {QUICK_ACTIONS.map(({ label, accessibilityLabel, icon, open }) => (
        <Pressable key={label} accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={open} style={styles.action}>
          {({ pressed }) => (
            <>
              <View style={[styles.actionCircle, pressed && styles.actionCirclePressed]}>
                <Icon name={icon} size={24} color={colors.primary} />
              </View>
              <Text style={styles.actionLabel}>{label}</Text>
            </>
          )}
        </Pressable>
      ))}
    </View>
  );
}

function TopSpenders({ summary }: { summary: HomeSummary }) {
  return (
    <View style={styles.spendersCard}>
      <View style={styles.spendersHeader}>
        <Text style={styles.spendersTitle}>Top spenders</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="See all appliances"
          onPress={() => router.navigate('/appliances')}
          style={({ pressed }) => [styles.seeAll, pressed && styles.seeAllPressed]}>
          <Text style={styles.seeAllLabel}>See all</Text>
          <Icon name="chevron_right" size={18} color={colors.primary} />
        </Pressable>
      </View>

      {summary.topCosts.map((item, index) => (
        <SpenderRow key={item.appliance.id} item={item} first={index === 0} />
      ))}
    </View>
  );
}

function SpenderRow({ item, first }: { item: CostlyAppliance; first: boolean }) {
  const { appliance, cost } = item;
  const palette = categoryColors[appliance.category];

  return (
    <View style={[styles.spenderRow, !first && styles.spenderDivider]}>
      <View style={[styles.spenderIcon, { backgroundColor: palette.iconBackground }]}>
        <Icon name={applianceIcon(appliance.name)} size={22} color={palette.iconTint} />
      </View>
      <View style={styles.spenderText}>
        <Text style={styles.spenderName} numberOfLines={1}>
          {appliance.name}
        </Text>
        <Text style={styles.spenderHours}>{Number(appliance.hoursPerDay.toFixed(1))} h a day</Text>
      </View>
      <View style={styles.spenderCost}>
        <Text style={styles.spenderValue}>{formatPeso(cost)}</Text>
        <Text style={styles.spenderUnit}>/ month</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Groups sit 24 apart; items inside a group 8 to 12.
  stack: {
    gap: spacing.lg,
  },

  // Bill card
  billCard: {
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
  billLabel: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  amount: {
    ...typography.receiptNumericLg,
    fontSize: 40,
    lineHeight: 48,
    color: colors.onSurface,
  },
  cents: {
    ...typography.receiptNumericLg,
    fontSize: 24,
    color: colors.outline,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
  target: {
    ...typography.labelMd,
    fontFamily: fontFamilies.inter.medium,
    color: colors.onSurfaceVariant,
  },
  // Tall enough for the bolt, which overlaps the bar's centre line.
  trackArea: {
    height: BOLT_SIZE,
    justifyContent: 'center',
  },
  track: {
    height: TRACK_HEIGHT,
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainer,
  },
  // Clips the moving pulse to the coloured part of the bar.
  fill: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
  goalFill: {
    backgroundColor: colors.primary,
  },
  excessFill: {
    backgroundColor: colors.error,
  },
  pulse: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  bolt: {
    position: 'absolute',
    top: 0,
    width: BOLT_SIZE,
    height: BOLT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainerLowest,
    boxShadow: shadows.level2,
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

  // Quick actions
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  action: {
    minWidth: 64,
    alignItems: 'center',
    gap: 6,
  },
  actionCircle: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainerLowest,
    boxShadow: shadows.level1,
  },
  actionCirclePressed: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  actionLabel: {
    ...typography.labelMd,
    color: colors.onSurface,
  },

  // Top spenders
  spendersCard: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLowest,
    boxShadow: shadows.level1,
  },
  spendersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  spendersTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
  },
  seeAll: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: spacing.sm,
    borderRadius: radii.md,
  },
  seeAllPressed: {
    backgroundColor: colors.surfaceContainer,
  },
  seeAllLabel: {
    ...typography.labelMd,
    color: colors.primary,
  },
  spenderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  spenderDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
  },
  spenderIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
  },
  spenderText: {
    flex: 1,
  },
  spenderName: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  spenderHours: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  spenderCost: {
    alignItems: 'flex-end',
  },
  spenderValue: {
    ...typography.receiptNumericMd,
    fontFamily: fontFamilies.mono.bold,
    color: colors.onSurface,
  },
  spenderUnit: {
    ...typography.receiptLabel,
    color: colors.onSurfaceVariant,
  },
});
