import { StyleSheet, Text, View } from 'react-native';

import { CategoryChip } from '@/components/category-chip';
import { colors, fontFamilies, radii, shadows, spacing, typography } from '@/constants/theme';
import type { PlanApplianceRow } from '@/optimizer/plan-appliances';
import { formatHours, formatPeso, formatPesoCut } from '@/utils/format';

/** Every appliance under the current plan: hours a day and monthly cost, changed ones tinted and first. */
export function PlanApplianceList({ rows }: { rows: PlanApplianceRow[] }) {
  return (
    <View style={styles.card}>
      <View style={styles.clip}>
        {rows.map((row, index) => (
          <PlanApplianceRowView key={row.appliance.id} row={row} first={index === 0} />
        ))}
      </View>
    </View>
  );
}

function PlanApplianceRowView({ row, first }: { row: PlanApplianceRow; first: boolean }) {
  const { appliance, changed } = row;
  const switchedOff = changed && row.toHoursPerDay === 0;
  const hours = changed
    ? `${formatHours(row.fromHoursPerDay)} → ${formatHours(row.toHoursPerDay)} a day`
    : `${formatHours(row.fromHoursPerDay)} a day`;

  return (
    <View style={[styles.row, !first && styles.rowDivider, changed && styles.rowChanged, switchedOff && styles.rowSwitchedOff]}>
      <View style={styles.lineOne}>
        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={1}>
            {appliance.name}
          </Text>
          <CategoryChip category={appliance.category} />
        </View>
        {changed && <Text style={styles.saving}>{formatPesoCut(row.saving)}</Text>}
      </View>

      <View style={styles.lineTwo}>
        <Text style={styles.hours} numberOfLines={1}>
          {hours}
        </Text>
        <View style={styles.costs}>
          {changed && <Text style={styles.defaultCost}>{formatPeso(row.defaultCost)} →</Text>}
          <Text style={styles.cost}>{formatPeso(row.monthlyCost)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // The shadow sits on the card; the clip keeps the tinted rows inside its rounded corners.
  card: {
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLowest,
    boxShadow: shadows.level1,
  },
  clip: {
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  row: {
    gap: 2,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
  },
  rowChanged: {
    backgroundColor: `${colors.tertiaryContainer}1A`,
  },
  rowSwitchedOff: {
    backgroundColor: `${colors.switchedOff}33`,
  },
  lineOne: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  identity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    ...typography.labelMd,
    flexShrink: 1,
    color: colors.onSurface,
  },
  saving: {
    ...typography.labelSm,
    fontFamily: fontFamilies.inter.bold,
    color: colors.tertiary,
    flexShrink: 0,
  },
  lineTwo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  hours: {
    ...typography.labelSm,
    flexShrink: 1,
    color: colors.onSurfaceVariant,
  },
  costs: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    flexShrink: 0,
  },
  defaultCost: {
    ...typography.receiptLabel,
    color: colors.onSurfaceVariant,
  },
  cost: {
    ...typography.receiptNumericMd,
    fontFamily: fontFamilies.mono.bold,
    color: colors.onSurface,
  },
});
