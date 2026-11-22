import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { JetBrainsMono_500Medium, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { BillHeaderActions } from '@/components/bill-header-actions';
import { HeaderAvatar } from '@/components/header-avatar';
import { colors, setColorScheme, typography } from '@/constants/theme';
import { hydrateStore } from '@/store/hydrate';
import { hydratePreferences, usePreferences } from '@/store/preferences';

SplashScreen.preventAutoHideAsync();

/** Back target for pushed screens, so a cold link to one still has Home beneath it. */
export const unstable_settings = { anchor: '(tabs)' };

/** Bottom sheet for the add/edit appliance routes. A function, so the sheet color follows the theme. */
function sheetOptions(detent: number) {
  return {
    presentation: 'formSheet' as const,
    headerShown: false,
    sheetAllowedDetents: [detent],
    contentStyle: { backgroundColor: colors.surfaceContainerLowest },
  };
}

export default function RootLayout() {
  const darkMode = usePreferences((state) => state.darkMode);
  const scheme = darkMode ? 'dark' : 'light';
  // Before anything below renders, so every screen reads the chosen palette.
  setColorScheme(scheme);

  useEffect(() => {
    // The window behind the app, seen during transitions and the keyboard animation.
    void SystemUI.setBackgroundColorAsync(colors.background);
  }, [scheme]);

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    Promise.all([hydrateStore(), hydratePreferences()]).then(() => setHydrated(true));
  }, []);

  // The native splash stays up (preventAutoHideAsync) until the overlay mounts, which waits for the
  // fonts and the saved household so no screen renders with the sample data first.
  if ((!fontsLoaded && !fontError) || !hydrated) return null;

  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <AnimatedSplashOverlay />
      {/* Keyed by theme: switching remounts the screens so every one redraws in the new palette. */}
      <Stack
        key={scheme}
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.onSurface,
          headerTitleStyle: typography.titleLg,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="bill-settings"
          options={{ title: 'My Electricity Bill', headerRight: () => <BillHeaderActions /> }}
        />
        <Stack.Screen name="plan-chat" options={{ title: 'Change the Plan', headerRight: () => <HeaderAvatar /> }} />
        <Stack.Screen name="appliance-add" options={sheetOptions(0.9)} />
        <Stack.Screen name="appliance-edit" options={sheetOptions(0.9)} />
        <Stack.Screen name="target-edit" options={sheetOptions(0.5)} />
        <Stack.Screen name="display-settings" options={sheetOptions(0.75)} />
      </Stack>
    </ThemeProvider>
  );
}
