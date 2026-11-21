import { useState } from 'react';
import { useAsync } from '../../../hooks/useAsync';
import { propertyService } from '../../../services/propertyService';
import { Property } from '../../../types';
import { useProperties } from './useProperties';

/** Compare up to 4 properties; defaults to the first three. */
export function useCompare() {
  const { data } = useProperties();
  const [removed, setRemoved] = useState<string[]>([]);
  const selected: Property[] = (data ?? []).filter(p => !removed.includes(p.id)).slice(0, 4);
  return { selected, remove: (id: string) => setRemoved(r => [...r, id]) };
}

/** Amenities of the compared properties: the union of labels and which property has which. */
export function useCompareAmenities(selected: Property[]) {
  return useAsync(async () => {
    const lists = await Promise.all(selected.map(p => propertyService.amenities(p.id)));
    const labels = [...new Set(lists.flatMap(list => list.map(a => a.label)))];
    return { labels, has: lists.map(list => new Set(list.map(a => a.label))) };
  }, [selected.map(p => p.id).join(',')]);
}
