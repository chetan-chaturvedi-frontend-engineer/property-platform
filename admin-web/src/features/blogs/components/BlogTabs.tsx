import Chip from '@mui/material/Chip';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';

import { formatNumber } from '@/utils/formatters';

export interface BlogTabOption<TValue extends string> {
  value: TValue;
  label: string;
  /** Shown beside the label; undefined while loading. */
  count?: number;
}

interface BlogTabsProps<TValue extends string> {
  value: TValue;
  options: readonly BlogTabOption<TValue>[];
  onChange: (value: TValue) => void;
  /** Accessible name of the tab list. */
  label: string;
}

/** Quick status filter above a list, with a record count on each tab. */
export function BlogTabs<TValue extends string>({
  value,
  options,
  onChange,
  label,
}: BlogTabsProps<TValue>) {
  return (
    <Tabs
      value={value}
      onChange={(_, next: TValue) => onChange(next)}
      aria-label={label}
      variant="scrollable"
      allowScrollButtonsMobile
      className="border-b px-2"
    >
      {options.map((option) => (
        <Tab
          key={option.value}
          value={option.value}
          className="min-h-12 normal-case"
          label={
            <span className="flex items-center gap-2">
              {option.label}
              {option.count !== undefined && (
                <Chip
                  size="small"
                  label={formatNumber(option.count)}
                  color={option.value === value ? 'primary' : 'default'}
                  className="h-5 text-xs"
                />
              )}
            </span>
          }
        />
      ))}
    </Tabs>
  );
}
