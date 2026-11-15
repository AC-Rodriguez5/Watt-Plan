import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { HomeDashboard } from '@/components/home-dashboard';
import { HomeSetup } from '@/components/home-setup';
import { colors, maxContentWidth, spacing } from '@/constants/theme';
import { averageDailyKwh, isHomeSetUp, summarizeHome } from '@/optimizer/home-summary';
import { useAppStore } from '@/store/app-store';

export default function HomeScreen() {
  const appliances = useAppStore((state) => state.appliances);
  const billSettings = useAppStore((state) => state.billSettings);
  const target = useAppStore((state) => state.target);

  const isSetUp = isHomeSetUp(appliances, billSettings);
  const summary = useMemo(
    () => (isSetUp ? summarizeHome(appliances, billSettings, target) : null),
    [isSetUp, appliances, billSettings, target],
  );

  return (
    <View style={styles.screen}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {summary ? (
            <HomeDashboard summary={summary} bill={billSettings} />
          ) : (
            <HomeSetup
              target={target}
              dailyKwh={averageDailyKwh(appliances)}
              hasAppliances={appliances.length > 0}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.margin,
  },
  content: {
    width: '100%',
    maxWidth: maxContentWidth - spacing.margin * 2,
    alignSelf: 'center',
  },
});
