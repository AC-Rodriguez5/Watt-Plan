import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { colors, radii, shadows, spacing, typography, themedStyles } from '@/constants/theme';
import type { PlanMode } from '@/types/energy';

const OPTIONS: { mode: PlanMode; label: string; icon: 'check_circle' | 'bedtime' }[] = [
  { mode: 'fewest-changes', label: 'Fewest changes', icon: 'check_circle' },
  { mode: 'comfort-first', label: 'Comfort first', icon: 'bedtime' },
];

type StrategyToggleProps = {
  value: PlanMode;
  onChange: (mode: PlanMode) => void;
};

/** Segmented button for the two plan strategies (design/screens/plan.png). */
export function StrategyToggle({ value, onChange }: StrategyToggleProps) {
  return (
    <View accessibilityRole="tablist" style={styles.track}>
      {OPTIONS.map(({ mode, label, icon }) => {
        const selected = mode === value;
        return (
          <Pressable
            key={mode}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(mode)}
            style={[styles.segment, selected && styles.segmentSelected]}>
            <Icon name={icon} size={18} color={selected ? colors.primary : colors.onSurfaceVariant} />
            <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = themedStyles(() => ({
  track: {
    flexDirection: 'row',
    padding: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainer,
  },
  segment: {
    flex: 1,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radii.full,
  },
  segmentSelected: {
    backgroundColor: colors.surfaceContainerLowest,
    boxShadow: shadows.level1,
  },
  label: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  labelSelected: {
    color: colors.onSurface,
  },
}));
