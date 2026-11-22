import { useState } from 'react';

import { type PickerOption, SearchAutocomplete } from '@/components/common/SearchAutocomplete';
import { useDebounce } from '@/hooks/useDebounce';
import { SEARCH_DEBOUNCE_MS } from '@/utils/constants';

import { useBuilderOptions } from '../../hooks/useProperties';
import type { BuilderAccount } from '../../types/property.types';

interface BuilderOption extends PickerOption {
  account: BuilderAccount;
}

function toOption(account: BuilderAccount): BuilderOption {
  return {
    id: account.id,
    label: account.fullName,
    detail: [account.email, account.phone].filter(Boolean).join(' · ') || undefined,
    account,
  };
}

interface BuilderPickerProps {
  value: BuilderAccount | null;
  onChange: (builder: BuilderAccount | null) => void;
  onBlur?: () => void;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
}

/** Search-as-you-type list of builder accounts (users with the builder role); loads while open. */
export function BuilderPicker({
  value,
  onChange,
  onBlur,
  error = false,
  helperText,
  required = false,
  disabled = false,
}: BuilderPickerProps) {
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const search = useDebounce(input.trim(), SEARCH_DEBOUNCE_MS);
  const options = useBuilderOptions(search, { enabled: open });
  return (
    <SearchAutocomplete<BuilderOption>
      label="Builder / Company"
      placeholder="Select Builder / Company"
      value={value ? toOption(value) : null}
      onChange={(next, option) => onChange(next ? (option?.account ?? value) : null)}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      onBlur={onBlur}
      inputValue={input}
      onInputChange={setInput}
      options={(options.data ?? []).map(toOption)}
      loading={options.isFetching}
      loadError={options.isError ? 'Could not load builders' : null}
      noOptionsText={
        search
          ? 'No matching builders'
          : 'No builder accounts yet. Give a user the Builder role first.'
      }
      error={error}
      helperText={helperText}
      required={required}
      disabled={disabled}
    />
  );
}
