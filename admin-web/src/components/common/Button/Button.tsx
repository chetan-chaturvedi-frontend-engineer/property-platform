import MuiButton, { type ButtonProps as MuiButtonProps } from '@mui/material/Button';

export interface ButtonProps extends MuiButtonProps {
  /** Shows a spinner, disables the button and marks it busy for assistive technology. */
  loading?: boolean;
}

/** The app's button: MUI's Button with consistent defaults and an accessible loading state. */
export function Button({
  loading = false,
  disabled,
  variant = 'contained',
  children,
  ...rest
}: ButtonProps) {
  return (
    <MuiButton
      variant={variant}
      loading={loading}
      loadingPosition="start"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {children}
    </MuiButton>
  );
}
