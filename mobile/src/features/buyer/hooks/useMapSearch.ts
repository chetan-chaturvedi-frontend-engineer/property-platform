import { useMemo, useState } from 'react';
import { useAsync } from '../../../hooks/useAsync';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { propertyService } from '../../../services/propertyService';
import { MapBounds, Property } from '../../../types';
import { boundsKey } from '../../../utils/mapRegion';
import { usePropertyFilters } from '../PropertyFiltersProvider';

const BOUNDS_DEBOUNCE_MS = 500;

/**
 * Search tab data. `all` is every match for the current search and filters (used to frame the map and to
 * list properties that have no position). `inView` is the backend's answer for the visible map area,
 * requested a moment after the map stops moving.
 */
export function useMapSearch() {
  const { filters, search } = usePropertyFilters();
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const debounced = useDebouncedValue(bounds, BOUNDS_DEBOUNCE_MS);
  const filterKey = JSON.stringify(filters);

  const all = useAsync(() => propertyService.search(filters, search), [filterKey, search]);
  const inView = useAsync(
    () => (debounced ? propertyService.search(filters, search, debounced) : Promise.resolve(undefined)),
    [filterKey, search, boundsKey(debounced)],
  );

  const unplaced = useMemo<Property[]>(() => (all.data?.items ?? []).filter(p => !p.coordinate), [all.data]);
  // Until the map reports its first area, the unbounded results stand in for "in view".
  const visible = useMemo<Property[]>(
    () => (debounced ? inView.data?.items : all.data?.items?.filter(p => p.coordinate)) ?? [],
    [debounced, inView.data, all.data],
  );
  return {
    all,
    inView,
    visible,
    unplaced,
    /** True while the visible-area request for the latest box is still running. */
    refreshing: bounds !== null && (boundsKey(bounds) !== boundsKey(debounced) || inView.loading),
    setBounds,
  };
}
