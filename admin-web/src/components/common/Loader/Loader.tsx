import CircularProgress from '@mui/material/CircularProgress';

interface LoaderProps {
  /** Accessible description of what is loading. */
  label?: string;
  /** Fill the viewport (app start) instead of the parent area. */
  fullScreen?: boolean;
}

export function Loader({ label = 'Loading', fullScreen = false }: LoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-1 items-center justify-center p-8 ${fullScreen ? 'min-h-dvh' : 'min-h-48'}`}
    >
      <CircularProgress aria-hidden size={36} />
      <span className="sr-only">{label}</span>
    </div>
  );
}
