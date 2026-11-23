import { categoryColors, colors, getColorScheme, setColorScheme, themedStyles } from '@/constants/theme';

jest.mock('@/global.css', () => ({}));

describe('theme', () => {
  afterEach(() => setColorScheme('light'));

  it('reads the active palette at the moment a color is used', () => {
    setColorScheme('light');
    const light = colors.background;
    setColorScheme('dark');
    expect(getColorScheme()).toBe('dark');
    expect(colors.background).not.toBe(light);
    expect(colors.onSurface).toBe('#e1e2ec');
  });

  it('builds a style sheet per theme, from the palette active when it is first used', () => {
    const styles = themedStyles(() => ({ card: { backgroundColor: colors.surfaceContainerLowest } }));
    setColorScheme('light');
    const light = styles.card.backgroundColor;
    setColorScheme('dark');
    expect(styles.card.backgroundColor).not.toBe(light);
    setColorScheme('light');
    expect(styles.card.backgroundColor).toBe(light);
  });

  it('keeps category colors in step with the theme', () => {
    setColorScheme('light');
    const light = categoryColors.luxury.iconTint;
    setColorScheme('dark');
    expect(categoryColors.luxury.iconTint).not.toBe(light);
  });

  it('uses 6-digit hex everywhere, so an alpha suffix can be appended', () => {
    for (const scheme of ['light', 'dark'] as const) {
      setColorScheme(scheme);
      for (const key of ['background', 'primary', 'onPrimary', 'error', 'tertiaryContainer', 'switchedOff'] as const) {
        expect(colors[key]).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });
});
