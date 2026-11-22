import { router } from 'expo-router';
import type { AndroidSymbol } from 'expo-symbols';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { colors, maxContentWidth, radii, spacing, themedStyles, typography } from '@/constants/theme';
import { usePreferences, type HomeLayout } from '@/store/preferences';

const LAYOUTS: { layout: HomeLayout; title: string; description: string; icon: AndroidSymbol }[] = [
  { layout: 'glance', title: 'Bill at a glance', description: 'Bill, shortcuts and top spenders', icon: 'dashboard' },
  { layout: 'breakdown', title: 'Where it goes', description: 'A ring of what each appliance costs', icon: 'donut_large' },
  { layout: 'journey', title: 'Bill journey', description: 'How far you are from your target', icon: 'route' },
];

/** Bottom sheet from Home's ⋮ button: pick the Home layout and turn dark mode on or off. */
export function DisplaySheet() {
  const insets = useSafeAreaInsets();
  const homeLayout = usePreferences((state) => state.homeLayout);
  const darkMode = usePreferences((state) => state.darkMode);
  const setHomeLayout = usePreferences((state) => state.setHomeLayout);
  const setDarkMode = usePreferences((state) => state.setDarkMode);

  return (
    <View style={styles.root}>
      <View style={styles.grabberArea}>
        <View style={styles.grabber} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: spacing.margin + insets.bottom }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Display</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}>
            <Icon name="close" size={24} color={colors.onSurfaceVariant} />
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Home layout</Text>
          <View accessibilityRole="radiogroup" accessibilityLabel="Home layout" style={styles.options}>
            {LAYOUTS.map(({ layout, title, description, icon }) => {
              const selected = layout === homeLayout;
              return (
                <Pressable
                  key={layout}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`${title}. ${description}`}
                  onPress={() => setHomeLayout(layout)}
                  style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.optionPressed]}>
                  <View style={[styles.optionIcon, selected && styles.optionIconSelected]}>
                    <Icon name={icon} size={22} color={selected ? colors.onPrimary : colors.primary} />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={styles.optionTitle}>{title}</Text>
                    <Text style={styles.optionDescription}>{description}</Text>
                  </View>
                  <Icon
                    name={selected ? 'radio_button_checked' : 'radio_button_unchecked'}
                    size={22}
                    color={selected ? colors.primary : colors.outline}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.darkRow}>
          <View style={styles.optionIconPlain}>
            <Icon name="dark_mode" size={22} color={colors.primary} />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Dark mode</Text>
            <Text style={styles.optionDescription}>Easier on the eyes at night</Text>
          </View>
          <Switch
            accessibilityLabel="Dark mode"
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: colors.surfaceContainerHighest, true: colors.primaryContainer }}
            thumbColor={darkMode ? colors.onPrimary : colors.surfaceContainerLowest}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = themedStyles(() => ({
  root: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
  },
  grabberArea: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: spacing.sm,
  },
  grabber: {
    width: 32,
    height: 4,
    borderRadius: radii.full,
    backgroundColor: colors.outlineVariant,
  },
  // Groups sit 24 apart; items inside a group 8 apart.
  content: {
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.margin,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    ...typography.headlineSm,
    flex: 1,
    color: colors.onSurface,
  },
  closeButton: {
    width: 48,
    height: 48,
    marginRight: -8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
  },
  closeButtonPressed: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    paddingHorizontal: spacing.xs,
  },
  options: {
    gap: spacing.sm,
  },
  option: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.surfaceContainerLow,
  },
  optionSelected: {
    borderColor: colors.primaryContainer,
  },
  optionPressed: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  optionIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerHigh,
  },
  optionIconSelected: {
    backgroundColor: colors.primaryContainer,
  },
  optionIconPlain: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerHigh,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  optionDescription: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  darkRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLow,
  },
}));
