import { useState } from 'react';
import { Property } from '../../../types';
import { useProperties } from './useProperties';

/** Compare up to 4 properties; defaults to the first three. */
export function useCompare() {
  const { data } = useProperties();
  const [removed, setRemoved] = useState<string[]>([]);
  const selected: Property[] = (data ?? []).filter(p => !removed.includes(p.id)).slice(0, 4);
  return { selected, remove: (id: string) => setRemoved(r => [...r, id]) };
}
