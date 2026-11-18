import ErrorOutline from '@mui/icons-material/ErrorOutline';
import Typography from '@mui/material/Typography';

import { Button } from '../Button';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title = 'Could not load data',
  message,
  onRetry,
  retryLabel = 'Try again',
}: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <ErrorOutline color="error" fontSize="large" aria-hidden />
      <Typography variant="h6" component="p">
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" className="max-w-md">
        {message}
      </Typography>
      {onRetry && (
        <Button variant="outlined" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
