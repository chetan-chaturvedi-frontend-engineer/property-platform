/**
 * Brand palettes. MUI exposes every value as a CSS variable (e.g. --mui-palette-primary-100), which
 * Tailwind maps in styles/index.css (bg-primary-100, text-primary-800, ...).
 */

/**
 * Primary brand color #eebe7f (shade 500) with a full scale: equal perceptual (OKLCH) lightness
 * steps at the same hue. The same scale serves light and dark mode.
 */
export const primaryShades = {
  50: '#fff7eb',
  100: '#fff0da',
  200: '#ffe6c4',
  300: '#fed9ab',
  400: '#f7cc93',
  500: '#eebe7f',
  600: '#c79a5d',
  700: '#a17943',
  800: '#7c5b2d',
  900: '#5b411b',
} as const;

/**
 * #eebe7f is light (1.7:1 on white), so text ON it is near-black (9.6:1). Primary-colored text,
 * borders and icons on light surfaces use shade 800 instead (6.2:1); see --app-primary-strong.
 */
const primary = {
  ...primaryShades,
  light: primaryShades[300],
  main: primaryShades[500],
  dark: primaryShades[600],
  contrastText: '#2b1d08',
} as const;

const secondary = {
  light: '#2dd4bf',
  main: '#0d9488',
  dark: '#115e59',
  contrastText: '#ffffff',
} as const;

export const status = {
  success: { main: '#15803d' },
  warning: { main: '#b45309' },
  error: { main: '#b91c1c' },
  info: { main: '#0369a1' },
} as const;

export const lightPalette = {
  primary,
  secondary,
  ...status,
  background: { default: '#f5f7fb', paper: '#ffffff' },
  text: { primary: '#0f172a', secondary: '#475569' },
  divider: '#e2e8f0',
} as const;

export const darkPalette = {
  primary,
  secondary: { light: '#5eead4', main: '#2dd4bf', dark: '#0f766e', contrastText: '#0b1220' },
  success: { main: '#4ade80' },
  warning: { main: '#fbbf24' },
  error: { main: '#f87171' },
  info: { main: '#38bdf8' },
  background: { default: '#0b1220', paper: '#111a2e' },
  text: { primary: '#e2e8f0', secondary: '#94a3b8' },
  divider: '#1e293b',
} as const;
