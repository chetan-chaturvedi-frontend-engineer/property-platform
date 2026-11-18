import { primaryShades } from './colors';
import { theme } from './theme';

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

/** The CSS-variables theme carries both color schemes and the stylesheets MUI injects. */
const cssVarsTheme = theme as unknown as {
  colorSchemes: Record<'light' | 'dark', { palette: { primary: Record<string, string> } }>;
  generateStyleSheets: () => unknown[];
};

describe('theme: primary color', () => {
  it.each(['light', 'dark'] as const)(
    'uses #eebe7f with readable text on it (%s mode)',
    (scheme) => {
      const primary = cssVarsTheme.colorSchemes[scheme].palette.primary;

      expect(primary.main).toBe('#eebe7f');
      expect(primary.contrastText).toBe('#2b1d08');
    },
  );

  it('exposes every shade from 50 to 900, with #eebe7f as 500', () => {
    const primary = cssVarsTheme.colorSchemes.light.palette.primary;

    expect(primaryShades[500]).toBe('#eebe7f');
    for (const shade of SHADES) {
      expect(primary[shade]).toBe(primaryShades[shade]);
    }
  });

  it('writes the shades as CSS variables that the Tailwind classes use', () => {
    const css = JSON.stringify(cssVarsTheme.generateStyleSheets()).toLowerCase();

    for (const shade of SHADES) {
      expect(css).toContain(`"--mui-palette-primary-${shade}":"${primaryShades[shade]}"`);
    }
    expect(css).toContain('"--mui-palette-primary-main":"#eebe7f"');
  });
});
