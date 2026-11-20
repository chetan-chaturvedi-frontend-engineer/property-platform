import { useState } from 'react';

import { useDebounce } from '@/hooks/useDebounce';
import { SEARCH_DEBOUNCE_MS } from '@/utils/constants';

import { useLeadOptions, usePropertyOptions, useUserOptions } from '../hooks/useSiteVisits';
import type { LeadPickerOption, PickerOption } from '../types/siteVisit.types';

import { SearchAutocomplete, type SearchAutocompleteProps } from './SearchAutocomplete';

type PickerProps<TOption extends PickerOption> = Omit<
  SearchAutocompleteProps<TOption>,
  | 'options'
  | 'inputValue'
  | 'onInputChange'
  | 'loading'
  | 'loadError'
  | 'open'
  | 'onOpen'
  | 'onClose'
>;

/**
 * The typed text, debounced, and whether the list is open; options load only while it is open, so a
 * form with several pickers sends no requests until one is used.
 */
function usePickerSearch() {
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const search = useDebounce(input.trim(), SEARCH_DEBOUNCE_MS);
  return { input, setInput, open, setOpen, search };
}

/** Active accounts (agents, visitors) by name, email or phone; needs `USER_LIST`. */
export function UserPicker({
  noOptionsText = 'No matching active users',
  ...props
}: PickerProps<PickerOption>) {
  const { input, setInput, open, setOpen, search } = usePickerSearch();
  const options = useUserOptions(search, { enabled: open });
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

/** Properties by project name, builder or slug; needs `PROPERTY_LIST_ANY`. */
export function PropertyPicker({
  noOptionsText = 'No matching properties',
  ...props
}: PickerProps<PickerOption>) {
  const { input, setInput, open, setOpen, search } = usePickerSearch();
  const options = usePropertyOptions(search, { enabled: open });
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
      loadError={options.isError ? 'Could not load properties' : null}
      noOptionsText={noOptionsText}
    />
  );
}

/** Leads by name, email or phone; needs `LEAD_LIST_ANY`. */
export function LeadPicker({
  noOptionsText = 'No matching leads',
  ...props
}: PickerProps<LeadPickerOption>) {
  const { input, setInput, open, setOpen, search } = usePickerSearch();
  const options = useLeadOptions(search, { enabled: open });
  return (
    <SearchAutocomplete<LeadPickerOption>
      {...props}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      inputValue={input}
      onInputChange={setInput}
      options={options.data ?? []}
      loading={options.isFetching}
      loadError={options.isError ? 'Could not load leads' : null}
      noOptionsText={noOptionsText}
    />
  );
}
