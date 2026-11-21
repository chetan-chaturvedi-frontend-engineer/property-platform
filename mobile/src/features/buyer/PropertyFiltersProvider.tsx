import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { EMPTY_FILTERS, activeFilterCount } from '../../services/mappers/propertySearchMapper';
import { FilterState } from '../../types';

interface PropertyFiltersValue {
  filters: FilterState;
  search: string;
  activeCount: number;
  setFilters: (filters: FilterState) => void;
  setSearch: (search: string) => void;
  reset: () => void;
}

const PropertyFiltersContext = createContext<PropertyFiltersValue | undefined>(undefined);

/** Search text and filters shared by Home, Search and the Filters screen. */
export function PropertyFiltersProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [search, setSearch] = useState('');
  const reset = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setSearch('');
  }, []);
  const value = useMemo(
    () => ({ filters, search, activeCount: activeFilterCount(filters), setFilters, setSearch, reset }),
    [filters, search, reset],
  );
  return <PropertyFiltersContext.Provider value={value}>{children}</PropertyFiltersContext.Provider>;
}

export function usePropertyFilters(): PropertyFiltersValue {
  const context = useContext(PropertyFiltersContext);
  if (!context) {
    throw new Error('usePropertyFilters must be used inside <PropertyFiltersProvider>');
  }
  return context;
}
