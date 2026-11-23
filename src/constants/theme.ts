/**
 * Watt Plan theme: the single source for colors, typography, spacing and corner radii.
 * Values come from design/DESIGN.md (token front matter) and design/html (what the
 * screens actually render). Light by default; dark mode is a choice in Home's ⋮ menu.
 */

import '@/global.css';

import { Platform, StyleSheet } from 'react-native';

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const lightColors = {
  // Surfaces
  background: '#faf8ff',
  surface: '#faf8ff',
  surfaceDim: '#d2d9f4',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f2f3ff',
  surfaceContainer: '#eaedff',
  surfaceContainerHigh: '#e2e7ff',
  surfaceContainerHighest: '#dae2fd',
  surfaceVariant: '#dae2fd',
  inverseSurface: '#283044',
  inverseOnSurface: '#eef0ff',

  // Text on surfaces
  onBackground: '#131b2e',
  onSurface: '#131b2e',
  onSurfaceVariant: '#424654',

  // Lines
  outline: '#727786',
  outlineVariant: '#c2c6d7',

  // Primary (Electric Cobalt)
  primary: '#004cb0',
  onPrimary: '#ffffff',
  primaryContainer: '#0263e0',
  onPrimaryContainer: '#e5eaff',
  primaryFixed: '#d9e2ff',
  primaryFixedDim: '#b0c6ff',
  onPrimaryFixed: '#001944',
  onPrimaryFixedVariant: '#00429a',
  inversePrimary: '#b0c6ff',
  surfaceTint: '#0058ca',

  // Secondary (Utility Slate)
  secondary: '#3b608c',
  onSecondary: '#ffffff',
  secondaryContainer: '#a7ccfe',
  onSecondaryContainer: '#305681',
  secondaryFixed: '#d3e4ff',
  secondaryFixedDim: '#a5c9fb',
  onSecondaryFixed: '#001c38',
  onSecondaryFixedVariant: '#214873',

  // Tertiary (Tariff Green: savings, feasible)
  tertiary: '#005f27',
  onTertiary: '#ffffff',
  tertiaryContainer: '#007b34',
  onTertiaryContainer: '#aaffb3',
  tertiaryFixed: '#7ffc97',
  tertiaryFixedDim: '#62df7d',
  onTertiaryFixed: '#002109',
  onTertiaryFixedVariant: '#005320',

  // Error
  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',

  // Alert / over budget (High-load Orange: luxury chips, overruns)
  alert: '#ea580c',
  alertContainer: '#fff7ed',
  alertBorder: '#fed7aa',
  /** Pressed state of an action on alertContainer */
  alertContainerPressed: '#ffedd5',
  /** Text on alertContainer */
  onAlertContainer: '#7c2d12',
  /** Action text on alertContainer */
  alertAction: '#c2410c',

  // Switched off (plan list rows cut to 0 hours a day)
  switchedOff: '#facc15',

  // Over photos and other fixed-dark backdrops: the same in both themes.
  scrim: '#000000',
  onScrim: '#ffffff',
};

/** Every color role. All values are 6-digit hex, so code can append a 2-digit alpha (`${colors.x}66`). */
export type Palette = { [K in keyof typeof lightColors]: string };
export type ColorToken = keyof Palette;

/**
 * The same roles for dark mode, following Material 3's dark scheme for this seed. Light tones become
 * the text and accent colors and dark tones the surfaces. Filled buttons turn light blue with dark
 * text, which is why `primaryContainer` is light here and `onPrimary` dark. The "fixed" roles keep
 * their light values, as in Material 3.
 */
const darkColors: Palette = {
  background: '#111318',
  surface: '#111318',
  surfaceDim: '#111318',
  surfaceContainerLowest: '#1b1d25',
  surfaceContainerLow: '#20232c',
  surfaceContainer: '#262933',
  surfaceContainerHigh: '#2f323d',
  surfaceContainerHighest: '#393c48',
  surfaceVariant: '#424654',
  inverseSurface: '#e1e2ec',
  inverseOnSurface: '#2e3038',

  onBackground: '#e1e2ec',
  onSurface: '#e1e2ec',
  onSurfaceVariant: '#c2c6d7',

  outline: '#8c90a1',
  outlineVariant: '#424654',

  primary: '#b0c6ff',
  onPrimary: '#002d6e',
  primaryContainer: '#8fb2ff',
  onPrimaryContainer: '#001b45',
  primaryFixed: '#d9e2ff',
  primaryFixedDim: '#b0c6ff',
  onPrimaryFixed: '#001944',
  onPrimaryFixedVariant: '#00429a',
  inversePrimary: '#0058ca',
  surfaceTint: '#b0c6ff',

  secondary: '#a7c8fa',
  onSecondary: '#04305a',
  secondaryContainer: '#2b4c76',
  onSecondaryContainer: '#d3e4ff',
  secondaryFixed: '#d3e4ff',
  secondaryFixedDim: '#a5c9fb',
  onSecondaryFixed: '#001c38',
  onSecondaryFixedVariant: '#214873',

  tertiary: '#6fdd8b',
  onTertiary: '#003916',
  tertiaryContainer: '#007b34',
  onTertiaryContainer: '#aaffb3',
  tertiaryFixed: '#7ffc97',
  tertiaryFixedDim: '#62df7d',
  onTertiaryFixed: '#002109',
  onTertiaryFixedVariant: '#005320',

  error: '#ffb4ab',
  onError: '#690005',
  errorContainer: '#93000a',
  onErrorContainer: '#ffdad6',

  alert: '#fb923c',
  alertContainer: '#3a1f0e',
  alertBorder: '#7c3a12',
  alertContainerPressed: '#4a2812',
  onAlertContainer: '#fed7aa',
  alertAction: '#fdba74',

  switchedOff: '#facc15',

  scrim: '#000000',
  onScrim: '#ffffff',
};

export type ColorScheme = 'light' | 'dark';

const PALETTES: Record<ColorScheme, Palette> = { light: lightColors, dark: darkColors };

let activeScheme: ColorScheme = 'light';

/**
 * Picks the palette that `colors` and `themedStyles` read. The root layout calls it with the saved
 * choice before it renders, and remounts the app when the choice changes so every screen redraws.
 */
export function setColorScheme(scheme: ColorScheme): void {
  activeScheme = scheme;
}

export function getColorScheme(): ColorScheme {
  return activeScheme;
}

/**
 * The active palette. Read it while rendering or inside `themedStyles`. Never copy a value into a
 * module-level constant: that runs once at startup and would stay light in dark mode.
 */
export const colors: Palette = new Proxy({} as Palette, {
  get: (_, key) => PALETTES[activeScheme][key as ColorToken],
});

/**
 * `StyleSheet.create` for styles that use `colors`. The factory runs once per theme, on first use,
 * so `themedStyles(() => ({ ... }))` reads the palette that is active when the screen draws.
 */
export function themedStyles<S extends StyleInput>(factory: () => S & StyleInput): Readonly<S> {
  const sheets: Partial<Record<ColorScheme, Readonly<S>>> = {};
  return new Proxy({} as Readonly<S>, {
    get: (_, key) => (sheets[activeScheme] ??= StyleSheet.create(factory()))[key as keyof S],
  });
}

/** What `StyleSheet.create` accepts. */
type StyleInput = Parameters<typeof StyleSheet.create>[0];

type CategoryPalette = {
  chipBackground: string;
  chipText: string;
  iconBackground: string;
  iconTint: string;
  barColor: string;
};

/** Appliance category styling, as drawn on the appliance cards. Getters, so they follow the theme. */
export const categoryColors: Record<'essential' | 'flexible' | 'luxury', CategoryPalette> = {
  get essential() {
    return {
      chipBackground: colors.surfaceContainer,
      chipText: colors.onSurfaceVariant,
      iconBackground: colors.surfaceContainerHigh,
      iconTint: colors.onSurfaceVariant,
      barColor: colors.secondary,
    };
  },
  get flexible() {
    return {
      chipBackground: colors.secondaryContainer,
      chipText: colors.onSecondaryContainer,
      iconBackground: `${colors.secondaryContainer}66`,
      iconTint: colors.primary,
      barColor: colors.primaryContainer,
    };
  },
  // High-load orange, not red: red is kept for over budget and delete.
  get luxury() {
    return {
      chipBackground: colors.alertContainer,
      chipText: colors.alertAction,
      iconBackground: colors.alertContainer,
      iconTint: colors.alert,
      barColor: colors.alert,
    };
  },
};

/**
 * What each signal color means, everywhere in the app:
 * - red (`error`): over budget, and delete or reset
 * - green (`tertiary`): savings and on track
 * - orange (`alert`): a warning, a high-draw appliance, or a luxury one
 */

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

/**
 * Font family names as registered by useFonts in src/app/_layout.tsx.
 * React Native on Android needs one family per weight, so weight is baked in
 * and the type styles below do not set `fontWeight`.
 */
export const fontFamilies = {
  inter: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
  mono: {
    medium: 'JetBrainsMono_500Medium',
    bold: 'JetBrainsMono_700Bold',
  },
} as const;

export const typography = {
  headlineLg: { fontFamily: fontFamilies.inter.bold, fontSize: 32, lineHeight: 40, letterSpacing: -0.64 },
  headlineMd: { fontFamily: fontFamilies.inter.semiBold, fontSize: 26, lineHeight: 32, letterSpacing: -0.26 },
  headlineSm: { fontFamily: fontFamilies.inter.semiBold, fontSize: 22, lineHeight: 28 },
  titleLg: { fontFamily: fontFamilies.inter.semiBold, fontSize: 20, lineHeight: 26 },
  titleMd: { fontFamily: fontFamilies.inter.semiBold, fontSize: 18, lineHeight: 24 },
  bodyLg: { fontFamily: fontFamilies.inter.regular, fontSize: 16, lineHeight: 24 },
  bodyMd: { fontFamily: fontFamilies.inter.medium, fontSize: 16, lineHeight: 24 },
  labelMd: { fontFamily: fontFamilies.inter.semiBold, fontSize: 14, lineHeight: 20, letterSpacing: 0.14 },
  labelSm: { fontFamily: fontFamilies.inter.medium, fontSize: 12, lineHeight: 16 },
  receiptNumericLg: { fontFamily: fontFamilies.mono.bold, fontSize: 24, lineHeight: 28, letterSpacing: -0.72 },
  receiptNumericMd: { fontFamily: fontFamilies.mono.medium, fontSize: 16, lineHeight: 22 },
  receiptLabel: { fontFamily: fontFamilies.mono.medium, fontSize: 12, lineHeight: 16, letterSpacing: 0.6 },
} as const;

// ---------------------------------------------------------------------------
// Spacing (8dp baseline, 4dp for micro-alignment)
// ---------------------------------------------------------------------------

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  gutter: 16,
  margin: 16,
} as const;

/** Content is centered at this width on screens wider than 480dp. */
export const maxContentWidth = 412;

// ---------------------------------------------------------------------------
// Corner radii
// ---------------------------------------------------------------------------

export const radii = {
  sm: 4,
  /** Buttons and text inputs */
  md: 8,
  /** Cards and standard surfaces */
  lg: 12,
  /** Floating action button */
  xl: 16,
  /** Chips and pills */
  full: 9999,
} as const;

// ---------------------------------------------------------------------------
// Elevation
// ---------------------------------------------------------------------------

export const shadows = {
  level1: '0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04)',
  level2: '0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05)',
  appBar: '0 1px 8px 0 rgba(0, 0, 0, 0.04)',
  level3: '0 10px 15px -3px rgba(2, 99, 224, 0.25), 0 4px 6px -4px rgba(2, 99, 224, 0.15)',
  receipt: '0 8px 20px -4px rgba(15, 23, 42, 0.12)',
} as const;

// ---------------------------------------------------------------------------
// Legacy exports used by the unmodified Expo starter files (themed-text,
// app-tabs, index.tsx, explore.tsx, ...). Remove together with those files
// when the real screens replace them.
// ---------------------------------------------------------------------------

export const Colors = {
  light: {
    text: colors.onSurface,
    background: colors.background,
    backgroundElement: colors.surfaceContainer,
    backgroundSelected: colors.surfaceContainerHigh,
    textSecondary: colors.onSurfaceVariant,
  },
  dark: {
    text: colors.onSurface,
    background: colors.background,
    backgroundElement: colors.surfaceContainer,
    backgroundSelected: colors.surfaceContainerHigh,
    textSecondary: colors.onSurfaceVariant,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  default: {
    sans: fontFamilies.inter.regular,
    serif: 'serif',
    rounded: fontFamilies.inter.regular,
    mono: fontFamilies.mono.medium,
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
