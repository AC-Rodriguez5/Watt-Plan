---
name: Household Utility Ledger
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#424654'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#727786'
  outline-variant: '#c2c6d7'
  surface-tint: '#0058ca'
  primary: '#004cb0'
  on-primary: '#ffffff'
  primary-container: '#0263e0'
  on-primary-container: '#e5eaff'
  inverse-primary: '#b0c6ff'
  secondary: '#3b608c'
  on-secondary: '#ffffff'
  secondary-container: '#a7ccfe'
  on-secondary-container: '#305681'
  tertiary: '#005f27'
  on-tertiary: '#ffffff'
  tertiary-container: '#007b34'
  on-tertiary-container: '#aaffb3'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d9e2ff'
  primary-fixed-dim: '#b0c6ff'
  on-primary-fixed: '#001944'
  on-primary-fixed-variant: '#00429a'
  secondary-fixed: '#d3e4ff'
  secondary-fixed-dim: '#a5c9fb'
  on-secondary-fixed: '#001c38'
  on-secondary-fixed-variant: '#214873'
  tertiary-fixed: '#7ffc97'
  tertiary-fixed-dim: '#62df7d'
  on-tertiary-fixed: '#002109'
  on-tertiary-fixed-variant: '#005320'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  title-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
  title-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  receipt-numeric-lg:
    fontFamily: JetBrains Mono
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.03em
  receipt-numeric-md:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 22px
  receipt-label:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style
The design system targets Filipino household budget managers, family providers, and renters across demographic spectrums (ages 20–60). It prioritizes absolute financial clarity, operational efficiency, and tangible relief from high utility volatility.

The aesthetic philosophy fuses pure Material Design 3 guidelines with tactile financial ephemera. It avoids decorative minimalism in favor of structured, utilitarian information architecture: prominent tap targets, ultra-legible typographic scales, clear state signaling, and physical receipt metaphors that make abstract kilowatt-hour consumption instantly legible as household currency.

## Colors
The color system operates strictly in light mode to ensure immediate readability under harsh ambient tropical daylight and on low-to-mid-tier Android LCD screens.

- **Primary (`#0263E0`)**: Electric Cobalt. Governs primary interactive triggers, system confirmations, active navigation states, and focal metrics.
- **Secondary (`#3B608C`)**: Utility Slate. Balances functional support structures, container frames, inactive control surfaces, and secondary badges.
- **Tertiary / Success (`#16A34A`)**: Tariff Green. Communicates budget feasibility, negative variance (savings), safe runtimes, and baseline appliances.
- **Alert / Over-Budget (`#EA580C`)**: High-load Orange. Explicitly flags threshold violations, high-draw appliance categories, and budget overruns.
- **Surface Canvas (`#F4F7FB`)**: Cool ambient base preventing pure white eye fatigue while maintaining contrast ratios above 7:1 against text tokens.
- **Surface Containers (`#FFFFFF`, `#EEF2F8`, `#E2E8F0`)**: Distinct tonal steps used to layer interactive cards and data tables without reliance on harsh lines.

## Typography
Typographic rules strictly mandate that standard text content does not fall below 16px (`1rem` / `16sp`) to ensure immediate legibility for multi-generational household decision makers. 

- **Primary Interface Family (Inter)**: Clean, neutral neo-grotesque type engineered for dense Android system tables, lists, and form controls.
- **Calculation & Ledger Family (JetBrains Mono)**: Applied strictly to currency units (₱), numerical energy quantities (kWh, W), runtimes, calculations, and the thermal receipt component. Numbers must align tabularly to prevent optical jitter when recalculating real-time loads.

## Layout & Spacing
The layout adheres strictly to an Android viewport base of **360dp x 800dp**. 

- **Grid Framework**: 4-column fluid layout with an edge margin of `16dp` (`1rem`) and standard gutters of `16dp` (`1rem`). On screens beyond 480dp width, the content centers with a maximum structural width of `412dp` to preserve thumb-driven reachability.
- **Rhythm**: Spacing units adhere strictly to an 8dp systemic baseline, with 4dp increments used solely for micro-alignments in badge padding, currency symbols, and outline offsets.
- **Touch Target Integrity**: No interactive component (input trigger, quick-adjust toggle, navigation destination, or list row CTA) may have a visual or interactive bound smaller than `48dp x 48dp`.

## Elevation & Depth
Depth is communicated through architectural surface layering and ambient illumination rather than heavy drop shadows:

- **Level 0 (Base Surface)**: Flat `#F4F7FB`. Carries layout structures and parent viewport scrollviews.
- **Level 1 (Card & Content Surface)**: Solid `#FFFFFF` bordered by a crisp `1dp` stroke of `#CBD5E1`. Elevation is supported by a diffuse ambient shadow: `box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04)`.
- **Level 2 (Active Cards & Action Sheets)**: Solid `#FFFFFF` with `box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05)`.
- **Level 3 (Floating Action Button & Overlays)**: Surface `#0263E0` with `box-shadow: 0 10px 15px -3px rgba(2, 99, 224, 0.25), 0 4px 6px -4px rgba(2, 99, 224, 0.15)`.
- **Special Elevation (Paper Receipt)**: Physical drop illusion using a soft downward vertical offset `0 8px 16px -4px rgba(15, 23, 42, 0.1)` on pure `#FFFFFF` stock, accented by an inset dashed divider line to simulate paper scoring.

## Shapes
The shape language follows Material Design 3 rounded metrics with specialized adjustments for functional containers:

- **Standard Surfaces & Cards**: `rounded-xl` (`12dp` / `0.75rem`) to maintain structural firmness.
- **Buttons & Text Inputs**: `rounded-lg` (`8dp` / `0.5rem`) for crisp actionable touch points.
- **Floating Action Button**: `rounded-2xl` (`16dp` / `1rem`) on a standard `56dp x 56dp` frame.
- **Filter & Classification Chips**: Pill-shaped (`9999px`) to distinguish categorical filters from static data cards.
- **Receipt Container**: Strict `0dp` bottom corners coupled with an SVG-rendered zig-zag/serrated cut-off mask (sawtooth pattern: 6dp width per tooth, 4dp depth) to evoke physical billing paper.

## Components

### Buttons
- **Filled Primary**: Height 48dp, background `#0263E0`, text `#FFFFFF`, font `Inter 16px SemiBold`. Active state shifts to `#0056D2`. Padding: 0 24dp.
- **Outlined Secondary**: Height 48dp, transparent background, 1.5dp border `#CBD5E1`, text `#0F172A`. Focused/active border shifts to `#0263E0`.
- **Floating Action Button (FAB)**: 56dp x 56dp container, background `#0263E0`, icon 24dp `#FFFFFF`. Placed bottom-right at 16dp margin above the NavigationBar.

### Text Fields (M3 Outlined)
- Container height 56dp with floating label mechanism.
- Border: 1dp `#CBD5E1` resting, 2dp `#0263E0` focused, 2dp `#EA580C` error.
- Prefix Container: Fixed `₱` symbol rendered in `JetBrains Mono 16px Medium` in `#475569`.
- Input Value: `JetBrains Mono 16px Bold` for numbers, `Inter 16px Regular` for alphanumeric labels.
- Helper & Error Text: `Inter 12px` aligned 16dp from the left edge.

### Category Chips (Appliance Classification)
- Height: 36dp with a minimum tap target boundary of 48dp.
- **Essential**: Border 1dp `#475569`, Background `#F1F5F9`, Text `#0F172A`.
- **Flexible**: Border 1dp `#0263E0`, Background `#EFF6FF`, Text `#0263E0`.
- **Luxury / High-Draw**: Border 1dp `#EA580C`, Background `#FFF7ED`, Text `#EA580C`.

### Household Appliance Cards
- White `#FFFFFF` card, 12dp border-radius, 1dp border `#CBD5E1`.
- Internal structure: Appliance icon badge (40dp x 40dp `#EEF2F8`), Appliance Name (`Inter 16px SemiBold`), Category Chip, and a right-aligned power usage computation (`JetBrains Mono 16px Bold`).
- Swipe/Adjuster interactions strictly preserve 48dp minimum row heights for switch controls and quick-add Steppers (`+` / `-`).

### Signature Element: Thermal Paper Receipt
- Structural container: Pure white background `#FFFFFF`, width 100% (max 328dp), centered in the viewport.
- Top and Side Borders: 1dp solid `#CBD5E1`.
- Bottom Edge: Custom CSS/SVG jagged saw-tooth torn paper line.
- Content Layout: Monospaced ledger items with dotted rule leaders (`. . . . .`) connecting appliance names to their respective Peso allocation.
- Stamps: Skewed (-3deg) outline stamp box (border 2dp, font `JetBrains Mono 14px Bold`, uppercase, tracking 0.1em):
  * **TARGET MET**: `#16A34A` border and text.
  * **BUDGET FEASIBLE**: `#0263E0` border and text.
  * **IMPOSSIBLE TARGET / OVER BUDGET**: `#EA580C` border and text.

### Navigation
- **Top App Bar**: 64dp height, surface `#F4F7FB`, prominent screen title in `Inter 20px SemiBold`, with left 48dp touch target for Up/Back action and right 48dp utility actions (e.g., Reset, Export).
- **M3 NavigationBar**: 80dp fixed height at bottom edge, surface `#FFFFFF`, top border 1dp `#E2E8F0`. 3 Destinations: *Home*, *Appliances*, *Plan*. Active indicators utilize a pill container `#EFF6FF` with `#0263E0` icons and `Inter 12px SemiBold` labels.