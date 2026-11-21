/** Single source of truth for every color in the app. Never hard-code hex values elsewhere. */
export const colors = {
  // Brand: a rich gold-brown. `primary` is 5.9:1 on white and 5.6:1 on `background`, so it carries text and buttons.
  primary: '#8A5A1E',
  primaryDark: '#6B4413',
  primarySoft: '#F3E4CC',
  primaryTint: '#FAF1E4',
  /** Bright gold for accents on dark surfaces (the dark hero and cards); too light for text on light ones. */
  accent: '#D9AD5F',
  background: '#FBF8F3',
  surface: '#F5EEE4',
  border: '#E9DFD0',
  text: '#1E1B16',
  textMuted: '#6E655A',
  textFaint: '#8A8072',
  textInverse: '#FFFFFF',
  success: '#16A34A',
  successSoft: '#E7F7ED',
  warning: '#F59E0B',
  warningText: '#B7791F',
  warningSoft: '#FEF3DC',
  danger: '#E5484D',
  dangerSoft: '#FDECEC',
  orange: '#F97316',
  orangeSoft: '#FFF0E4',
  blueSoft: '#E6F0FF',
  /** Deep navy used behind light text (hero, banners, dark cards). */
  dark: '#1B2230',
  overlay: 'rgba(0,0,0,0.55)',
  overlayLight: 'rgba(255,255,255,0.55)',
  shadow: '#4A3412',
  photoTones: ['#2B3447', '#6B4E3D', '#3F5A58', '#5A4A33', '#3D4A5C'],
} as const;

export type ColorName = keyof typeof colors;
