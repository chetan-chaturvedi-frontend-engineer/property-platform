import React, { useEffect, useState } from 'react';
import { TextField } from '../../../components';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { usePropertyFilters } from '../PropertyFiltersProvider';

/** Search field wired to the shared search text; the query runs after the user stops typing. */
export function SearchBox() {
  const { search, setSearch } = usePropertyFilters();
  const [text, setText] = useState(search);
  const debounced = useDebouncedValue(text);

  useEffect(() => {
    setSearch(debounced);
  }, [debounced, setSearch]);

  // Follow resets that happen elsewhere (e.g. "Clear All").
  useEffect(() => {
    setText(search);
  }, [search]);

  return (
    <TextField
      icon="search"
      placeholder="Search by locality, project or builder"
      value={text}
      onChangeText={setText}
      returnKeyType="search"
      autoCorrect={false}
    />
  );
}
