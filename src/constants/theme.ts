/**
 * Watt Plan theme: the single source for colors, typography, spacing and corner radii.
 * Values come from design/DESIGN.md (token front matter) and design/html (what the
 * screens actually render). Light mode only.
 */

import '@/global.css';

import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

export const colors = {
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
} as const;

export type ColorToken = keyof typeof colors;

/** Appliance category styling, as drawn on the appliance cards (design/screens/appliances.png). */
export const categoryColors = {
  essential: {
    chipBackground: colors.surfaceContainer,
    chipText: colors.onSurfaceVariant,
    iconBackground: colors.surfaceContainerHigh,
    iconTint: colors.onSurfaceVariant,
  },
  flexible: {
    chipBackground: colors.secondaryContainer,
    chipText: colors.onSecondaryContainer,
    iconBackground: `${colors.secondaryContainer}66`,
    iconTint: colors.primary,
  },
  luxury: {
    chipBackground: colors.errorContainer,
    chipText: colors.onErrorContainer,
    iconBackground: `${colors.errorContainer}66`,
    iconTint: colors.error,
  },
} as const;

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
