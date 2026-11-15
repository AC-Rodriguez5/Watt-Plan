import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { JetBrainsMono_500Medium, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { BillHeaderActions } from '@/components/bill-header-actions';
import { HeaderAvatar } from '@/components/header-avatar';
import { colors, typography } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

/** Back target for pushed screens, so a cold link to one still has Home beneath it. */
export const unstable_settings = { anchor: '(tabs)' };

/** Bottom sheet for the add/edit appliance routes. */
const SHEET_OPTIONS = {
  presentation: 'formSheet',
  headerShown: false,
  sheetAllowedDetents: [0.9] as number[],
  contentStyle: { backgroundColor: colors.surfaceContainerLowest },
} as const;

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  // The native splash stays up (preventAutoHideAsync) until the overlay mounts.
  if (!fontsLoaded && !fontError) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack
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
        <Stack.Screen name="plan-chat" options={{ title: 'Change The Plan', headerRight: () => <HeaderAvatar /> }} />
        <Stack.Screen name="appliance-add" options={SHEET_OPTIONS} />
        <Stack.Screen name="appliance-edit" options={SHEET_OPTIONS} />
      </Stack>
    </ThemeProvider>
  );
}
