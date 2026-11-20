import type { FilterChip } from '@/components/common/ActiveFilterChips';

import type { StateFilter } from '../hooks/useBannerListParams';
import type { BannerLinkType } from '../types/banner.types';

/** The filters the side panel edits; applied together with "Apply filters". */
export interface BannerPanelFilters {
  linkType: BannerLinkType | '';
  /** `yyyy-MM-dd`, inclusive. */
  startFrom: string;
  startTo: string;
  endFrom: string;
  endTo: string;
}

export const EMPTY_BANNER_PANEL: BannerPanelFilters = {
  linkType: '',
  startFrom: '',
  startTo: '',
  endFrom: '',
  endTo: '',
};

export const STATE_FILTER_LABELS: Record<StateFilter, string> = {
  active: 'Active (enabled)',
  inactive: 'Inactive',
  scheduled: 'Scheduled',
  expired: 'Expired',
};

export const LINK_TYPE_LABELS: Record<BannerLinkType, string> = {
  internal: 'Internal link',
  external: 'External link',
};

function rangeLabel(name: string, from: string, to: string): string {
  if (from && to) return `${name}: ${from} – ${to}`;
  return from ? `${name} from ${from}` : `${name} until ${to}`;
}

/**
 * The applied panel filters as chips; `remove` receives the URL keys to drop. A range is one chip,
 * so removing it clears both bounds.
 */
export function activeBannerChips(
  applied: BannerPanelFilters,
  remove: (urlKeys: string[]) => void,
): FilterChip[] {
  const chips: FilterChip[] = [];
  if (applied.linkType) {
    chips.push({
      key: 'link',
      label: LINK_TYPE_LABELS[applied.linkType],
      onRemove: () => remove(['link']),
    });
  }
  if (applied.startFrom || applied.startTo) {
    chips.push({
      key: 'start',
      label: rangeLabel('Starts', applied.startFrom, applied.startTo),
      onRemove: () => remove(['sFrom', 'sTo']),
    });
  }
  if (applied.endFrom || applied.endTo) {
    chips.push({
      key: 'end',
      label: rangeLabel('Ends', applied.endFrom, applied.endTo),
      onRemove: () => remove(['eFrom', 'eTo']),
    });
  }
  return chips;
}
