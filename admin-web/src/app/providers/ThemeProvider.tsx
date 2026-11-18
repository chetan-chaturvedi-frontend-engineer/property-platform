import CssBaseline from '@mui/material/CssBaseline';
import GlobalStyles from '@mui/material/GlobalStyles';
import { StyledEngineProvider, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import type { ReactNode } from 'react';

import { theme } from '@/theme/theme';

/** Same order as styles/index.css; declared here too so it holds whichever stylesheet loads first. */
const LAYER_ORDER = '@layer theme, base, mui, components, utilities;';

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <StyledEngineProvider enableCssLayer>
      <GlobalStyles styles={LAYER_ORDER} />
      {/* The chosen mode ("light" | "dark" | "system") is remembered by MUI in localStorage. */}
      <MuiThemeProvider theme={theme} defaultMode="system" disableTransitionOnChange>
        <CssBaseline enableColorScheme />
        {children}
      </MuiThemeProvider>
    </StyledEngineProvider>
  );
}
