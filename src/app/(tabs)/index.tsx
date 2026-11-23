import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { HomeDashboard } from '@/components/home-dashboard';
import { BreakdownDashboard, JourneyDashboard } from '@/components/home-layouts';
import { HomeSetup } from '@/components/home-setup';
import { colors, maxContentWidth, spacing, themedStyles } from '@/constants/theme';
import { averageDailyKwh, isHomeSetUp, summarizeHome } from '@/optimizer/home-summary';
import { useAppStore } from '@/store/app-store';
import { usePreferences } from '@/store/preferences';

export default function HomeScreen() {
  const appliances = useAppStore((state) => state.appliances);
  const billSettings = useAppStore((state) => state.billSettings);
  const target = useAppStore((state) => state.target);
  const baseline = useAppStore((state) => state.baseline);
  const homeLayout = usePreferences((state) => state.homeLayout);

  const isSetUp = isHomeSetUp(appliances, billSettings);
  const summary = useMemo(() => (isSetUp ? summarizeHome(baseline, target) : null), [isSetUp, baseline, target]);

  return (
    <View style={styles.screen}>
      <AppHeader title="Home" onMenu={() => router.push('/display-settings')} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {summary ? (
            homeLayout === 'breakdown' ? (
              <BreakdownDashboard summary={summary} bill={billSettings} />
            ) : homeLayout === 'journey' ? (
              <JourneyDashboard summary={summary} bill={billSettings} />
            ) : (
              <HomeDashboard summary={summary} bill={billSettings} />
            )
          ) : (
            <HomeSetup
              target={target}
              dailyKwh={averageDailyKwh(appliances)}
              hasAppliances={appliances.length > 0}
              estimatedBill={baseline.cost}
              predictedKwh={baseline.kwh}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = themedStyles(() => ({
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
}));
