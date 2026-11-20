import Autocomplete, { type AutocompleteProps } from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { useState } from 'react';

import { useDebounce } from '@/hooks/useDebounce';
import { SEARCH_DEBOUNCE_MS } from '@/utils/constants';

import { useAssigneeOptions } from '../hooks/useLeads';
import type { AssigneeValue } from '../types/lead.types';

interface AssigneeAutocompleteProps extends Omit<
  AutocompleteProps<AssigneeValue, false, false, false>,
  'options' | 'value' | 'onChange' | 'renderInput' | 'inputValue' | 'onInputChange'
> {
  value: AssigneeValue | null;
  onChange: (value: AssigneeValue | null) => void;
  label: string;
  helperText?: string;
  error?: boolean;
  required?: boolean;
}

/**
 * Searches active accounts by name, email or phone as the user types. Input control that loads its
 * own options, like a select bound to an API.
 */
export function AssigneeAutocomplete({
  value,
  onChange,
  label,
  helperText,
  error = false,
  required = false,
  size = 'small',
  ...rest
}: AssigneeAutocompleteProps) {
  const [input, setInput] = useState('');
  const search = useDebounce(input.trim(), SEARCH_DEBOUNCE_MS);
  const [open, setOpen] = useState(false);
  const options = useAssigneeOptions(search, { enabled: open });

  return (
    <Autocomplete<AssigneeValue, false, false, false>
      {...rest}
      size={size}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      value={value}
      onChange={(_, next) => onChange(next)}
      inputValue={input}
      onInputChange={(_, next) => setInput(next)}
      options={options.data ?? []}
      loading={options.isFetching}
      // The API already filtered by the search term.
      filterOptions={(items) => items}
      isOptionEqualToValue={(option, selected) => option.id === selected.id}
      getOptionLabel={(option) => option.fullName}
      noOptionsText={options.isError ? 'Could not load users' : 'No matching active users'}
      renderOption={(props, option) => {
        const { key, ...optionProps } = props;
        return (
          <li key={key} {...optionProps}>
            <div className="min-w-0">
              <div className="truncate">{option.fullName}</div>
              {option.email && <div className="text-muted truncate text-xs">{option.email}</div>}
            </div>
          </li>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          error={error || options.isError}
          helperText={options.isError ? options.error.message : helperText}
        />
      )}
    />
  );
}
