import type { TypographyVariantsOptions } from '@mui/material/styles';

/** System fonts: no web-font download, no layout shift, no third-party font requests. */
export const fontFamily = [
  'system-ui',
  '-apple-system',
  '"Segoe UI"',
  'Roboto',
  '"Helvetica Neue"',
  'Arial',
  'sans-serif',
].join(',');

export const typography: TypographyVariantsOptions = {
  fontFamily,
  h1: { fontSize: '2rem', fontWeight: 700, lineHeight: 1.25 },
  h2: { fontSize: '1.625rem', fontWeight: 700, lineHeight: 1.3 },
  h3: { fontSize: '1.375rem', fontWeight: 600, lineHeight: 1.35 },
  h4: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.4 },
  h5: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.4 },
  h6: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.5 },
  body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
  body2: { fontSize: '0.875rem', lineHeight: 1.55 },
  button: { textTransform: 'none', fontWeight: 600 },
};
