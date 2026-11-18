import TextField, { type TextFieldProps } from '@mui/material/TextField';
import { type Control, Controller, type FieldValues, type Path } from 'react-hook-form';

export type FormTextFieldProps<TValues extends FieldValues> = Omit<
  TextFieldProps,
  'name' | 'value' | 'defaultValue' | 'onChange' | 'onBlur' | 'error'
> & {
  name: Path<TValues>;
  control: Control<TValues>;
};

/**
 * MUI TextField bound to React Hook Form. Errors are shown as helper text, which MUI links to the
 * input with aria-describedby and aria-invalid, so screen readers announce them with the field.
 */
export function FormTextField<TValues extends FieldValues>({
  name,
  control,
  helperText,
  ...rest
}: FormTextFieldProps<TValues>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { ref, value, ...field }, fieldState: { error } }) => (
        <TextField
          {...rest}
          {...field}
          value={value ?? ''}
          inputRef={ref}
          error={Boolean(error)}
          helperText={error?.message ?? helperText}
        />
      )}
    />
  );
}
