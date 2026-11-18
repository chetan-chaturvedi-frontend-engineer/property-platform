import { createTheme } from '@mui/material/styles';

import { darkPalette, lightPalette } from './colors';
import { typography } from './typography';

/**
 * Primary color for text, borders and icons on surfaces: shade 800 in light mode, 400 in dark mode
 * (defined in styles/globals.css). Shade 500 (#eebe7f) itself is too light for text on white.
 */
export const PRIMARY_STRONG = 'var(--app-primary-strong)';

/**
 * One theme with light and dark color schemes. MUI writes the palette as CSS variables and puts a
 * `.light` / `.dark` class on <html>, which Tailwind's `dark:` variant also uses.
 */
export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    light: { palette: lightPalette },
    dark: { palette: darkPalette },
  },
  typography,
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          variants: [
            { props: { variant: 'text', color: 'primary' }, style: { color: PRIMARY_STRONG } },
            {
              props: { variant: 'outlined', color: 'primary' },
              style: { color: PRIMARY_STRONG, borderColor: PRIMARY_STRONG },
            },
          ],
        },
      },
    },
    MuiLink: {
      styleOverrides: { root: { color: PRIMARY_STRONG, textDecorationColor: 'currentColor' } },
    },
    MuiInputLabel: {
      styleOverrides: { root: { '&.Mui-focused:not(.Mui-error)': { color: PRIMARY_STRONG } } },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '&.Mui-focused:not(.Mui-error) .MuiOutlinedInput-notchedOutline': {
            borderColor: PRIMARY_STRONG,
          },
        },
      },
    },
    MuiCircularProgress: {
      styleOverrides: { colorPrimary: { color: PRIMARY_STRONG } },
    },
    MuiTextField: {
      defaultProps: { size: 'medium', fullWidth: true },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: ({ theme: t }) => ({
          backgroundImage: 'none',
          border: `1px solid ${t.vars?.palette.divider}`,
        }),
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: 'inherit' },
    },
    MuiTableCell: {
      styleOverrides: { head: { fontWeight: 600 } },
    },
  },
});
