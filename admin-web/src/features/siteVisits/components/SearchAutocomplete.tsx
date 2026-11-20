import Autocomplete, { type AutocompleteProps } from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

import type { PickerOption } from '../types/siteVisit.types';

export interface SearchAutocompleteProps<TOption extends PickerOption> extends Omit<
  AutocompleteProps<PickerOption, false, false, false>,
  'options' | 'value' | 'onChange' | 'renderInput' | 'inputValue' | 'onInputChange' | 'loading'
> {
  /** A value restored from the URL or a stored record may carry only an id and a label. */
  value: PickerOption | null;
  /** `option` is the full loaded option, when the choice came from the list. */
  onChange: (value: PickerOption | null, option?: TOption) => void;
  label: string;
  /** Options already filtered by the server for `inputValue`. */
  options: readonly TOption[];
  inputValue: string;
  onInputChange: (value: string) => void;
  loading?: boolean;
  /** Shown instead of the options when loading them failed. */
  loadError?: string | null;
  helperText?: string;
  error?: boolean;
  required?: boolean;
  noOptionsText?: string;
  placeholder?: string;
}

/** Search-as-you-type picker. Presentational: the caller loads the options for the typed text. */
export function SearchAutocomplete<TOption extends PickerOption>({
  value,
  onChange,
  label,
  options,
  inputValue,
  onInputChange,
  loading = false,
  loadError = null,
  helperText,
  error = false,
  required = false,
  noOptionsText = 'No matches',
  placeholder,
  size = 'small',
  ...rest
}: SearchAutocompleteProps<TOption>) {
  // The current value stays selectable even when the latest search did not return it.
  const choices: readonly PickerOption[] =
    value && !options.some((option) => option.id === value.id) ? [value, ...options] : options;

  return (
    <Autocomplete<PickerOption, false, false, false>
      {...rest}
      size={size}
      value={value}
      onChange={(_, next) =>
        onChange(next, next ? options.find((option) => option.id === next.id) : undefined)
      }
      inputValue={inputValue}
      onInputChange={(_, next) => onInputChange(next)}
      options={choices}
      loading={loading}
      // The API already filtered by the search term.
      filterOptions={(items) => items}
      isOptionEqualToValue={(option, current) => option.id === current.id}
      getOptionLabel={(option) => option.label}
      noOptionsText={loadError ?? noOptionsText}
      renderOption={(props, option) => {
        const { key, ...optionProps } = props;
        return (
          <li key={key} {...optionProps}>
            <div className="min-w-0">
              <div className="truncate">{option.label}</div>
              {option.detail && <div className="text-muted truncate text-xs">{option.detail}</div>}
            </div>
          </li>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          required={required}
          error={error || Boolean(loadError)}
          helperText={loadError ?? helperText}
        />
      )}
    />
  );
}
