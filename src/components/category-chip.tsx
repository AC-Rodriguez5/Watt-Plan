import { StyleSheet, Text, View } from 'react-native';

import { categoryColors, fontFamilies, radii, spacing, typography } from '@/constants/theme';
import type { ApplianceCategory } from '@/types/energy';

const LABELS: Record<ApplianceCategory, string> = {
  essential: 'Essential',
  flexible: 'Flexible',
  luxury: 'Luxury',
};

export function CategoryChip({ category }: { category: ApplianceCategory }) {
  const palette = categoryColors[category];
  return (
    <View style={[styles.chip, { backgroundColor: palette.chipBackground }]}>
      <Text style={[styles.label, { color: palette.chipText }]}>{LABELS[category]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    flexShrink: 0,
  },
  label: {
    ...typography.labelSm,
    fontFamily: fontFamilies.inter.semiBold,
    letterSpacing: 0.3,
  },
});
