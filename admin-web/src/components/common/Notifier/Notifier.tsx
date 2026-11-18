import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';

import { useNotificationStore } from '@/store/notificationStore';

const AUTO_HIDE_MS = 5000;

/** Shows queued notifications one at a time. */
export function Notifier() {
  const current = useNotificationStore((state) => state.queue[0]);
  const dismiss = useNotificationStore((state) => state.dismiss);

  if (!current) {
    return null;
  }
  return (
    <Snackbar
      key={current.id}
      open
      autoHideDuration={AUTO_HIDE_MS}
      onClose={(_, reason) => reason !== 'clickaway' && dismiss(current.id)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        severity={current.severity}
        variant="filled"
        onClose={() => dismiss(current.id)}
        className="w-full"
      >
        {current.message}
      </Alert>
    </Snackbar>
  );
}
