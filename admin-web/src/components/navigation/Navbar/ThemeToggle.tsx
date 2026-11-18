import DarkMode from '@mui/icons-material/DarkMode';
import LightMode from '@mui/icons-material/LightMode';
import IconButton from '@mui/material/IconButton';
import { useColorScheme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';

export function ThemeToggle() {
  const { mode, systemMode, setMode } = useColorScheme();
  const resolved = mode === 'system' ? systemMode : mode;
  const next = resolved === 'dark' ? 'light' : 'dark';
  const label = `Switch to ${next} mode`;

  return (
    <Tooltip title={label}>
      <IconButton aria-label={label} onClick={() => setMode(next)} color="inherit">
        {resolved === 'dark' ? <LightMode /> : <DarkMode />}
      </IconButton>
    </Tooltip>
  );
}
