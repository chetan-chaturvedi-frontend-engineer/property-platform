import { DefaultTheme, Theme } from '@react-navigation/native';
import { colors } from '../theme';

/** Navigation chrome (screen background, tab bar, borders) in the app palette, so no white flashes between screens. */
export const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
    notification: colors.danger,
  },
};
