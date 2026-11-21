import { useState } from 'react';

import {
  type PickerOption,
  SearchAutocomplete,
  type SearchAutocompleteProps,
} from '@/components/common/SearchAutocomplete';
import { useDebounce } from '@/hooks/useDebounce';
import { SEARCH_DEBOUNCE_MS } from '@/utils/constants';

import { useSystemLogUserOptions } from '../hooks/useSystemLogs';

type SystemLogUserPickerProps = Omit<
  SearchAutocompleteProps<PickerOption>,
  | 'options'
  | 'inputValue'
  | 'onInputChange'
  | 'loading'
  | 'loadError'
  | 'open'
  | 'onOpen'
  | 'onClose'
>;

/** Accounts by name, email or phone, any status; options load only while the list is open. */
export function SystemLogUserPicker({
  noOptionsText = 'No matching users',
  ...props
}: SystemLogUserPickerProps) {
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const search = useDebounce(input.trim(), SEARCH_DEBOUNCE_MS);
  const options = useSystemLogUserOptions(search, { enabled: open });
  return (
    <SearchAutocomplete
      {...props}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      inputValue={input}
      onInputChange={setInput}
      options={options.data ?? []}
      loading={options.isFetching}
      loadError={options.isError ? 'Could not load users' : null}
      noOptionsText={noOptionsText}
    />
  );
}
