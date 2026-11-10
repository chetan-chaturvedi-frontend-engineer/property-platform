import { TextStyle } from 'react-native';
import { colors } from './colors';

export const typography = {
  h1: { fontSize: 24, fontWeight: '700', color: colors.text },
  h2: { fontSize: 18, fontWeight: '700', color: colors.text },
  h3: { fontSize: 15, fontWeight: '600', color: colors.text },
  body: { fontSize: 13, color: colors.text },
  muted: { fontSize: 12, color: colors.textMuted },
  tiny: { fontSize: 10, color: colors.textMuted },
  button: { fontSize: 14, fontWeight: '600' },
} satisfies Record<string, TextStyle>;
