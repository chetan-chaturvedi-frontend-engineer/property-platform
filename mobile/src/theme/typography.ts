import { TextStyle } from 'react-native';
import { colors } from './colors';

/**
 * Playfair Display Bold (bundled in assets/fonts). The file name is the family on Android and the PostScript name
 * on iOS, and the weight is baked into the file, so no `fontWeight` goes with it.
 */
export const SERIF = 'PlayfairDisplay-Bold';

export const typography = {
  /** Brand wordmark and screen titles. */
  display: { fontFamily: SERIF, fontSize: 22, color: colors.text },
  h1: { fontFamily: SERIF, fontSize: 26, color: colors.text },
  h2: { fontSize: 18, fontWeight: '700', color: colors.text },
  h3: { fontSize: 15, fontWeight: '600', color: colors.text },
  body: { fontSize: 13, color: colors.text },
  muted: { fontSize: 12, color: colors.textMuted },
  tiny: { fontSize: 10, color: colors.textMuted },
  button: { fontSize: 14, fontWeight: '600' },
} satisfies Record<string, TextStyle>;
