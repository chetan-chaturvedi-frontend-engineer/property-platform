import type { FilterChip } from '@/components/common/ActiveFilterChips';

/** The filters the side panel edits; applied together with "Apply filters". */
export interface BlogPanelFilters {
  tag: string;
  /** `yyyy-MM-dd`, inclusive. */
  publishedFrom: string;
  publishedTo: string;
  createdFrom: string;
  createdTo: string;
}

export const EMPTY_BLOG_PANEL: BlogPanelFilters = {
  tag: '',
  publishedFrom: '',
  publishedTo: '',
  createdFrom: '',
  createdTo: '',
};

function rangeLabel(name: string, from: string, to: string): string {
  if (from && to) return `${name}: ${from} – ${to}`;
  return from ? `${name} from ${from}` : `${name} until ${to}`;
}

/**
 * The applied panel filters as chips; `remove` receives the URL keys to drop. A range is one chip,
 * so removing it clears both bounds.
 */
export function activeBlogChips(
  applied: BlogPanelFilters,
  remove: (urlKeys: string[]) => void,
): FilterChip[] {
  const chips: FilterChip[] = [];
  if (applied.tag) {
    chips.push({ key: 'tag', label: `Tag: ${applied.tag}`, onRemove: () => remove(['tag']) });
  }
  if (applied.publishedFrom || applied.publishedTo) {
    chips.push({
      key: 'published',
      label: rangeLabel('Published', applied.publishedFrom, applied.publishedTo),
      onRemove: () => remove(['pFrom', 'pTo']),
    });
  }
  if (applied.createdFrom || applied.createdTo) {
    chips.push({
      key: 'created',
      label: rangeLabel('Created', applied.createdFrom, applied.createdTo),
      onRemove: () => remove(['cFrom', 'cTo']),
    });
  }
  return chips;
}
