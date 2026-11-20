import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { formatNumber } from '@/utils/formatters';

import { type ChipColor, formatShare } from '../utils/leadDisplay';

export interface BreakdownItem {
  key: string;
  label: string;
  count: number;
  /** Theme palette color of the marker; `default` is neutral. */
  color?: ChipColor;
}

interface LeadBreakdownCardProps {
  title: string;
  items: readonly BreakdownItem[];
  total: number;
  isLoading?: boolean;
  /** Called with the item key; rows become buttons that apply that filter. */
  onSelect?: (key: string) => void;
  /** The key of the filter currently applied, highlighted in the list. */
  selectedKey?: string;
}

const markerColor = (color: ChipColor = 'default') =>
  color === 'default' ? 'var(--mui-palette-text-disabled)' : `var(--mui-palette-${color}-main)`;

/** Counts with their share of the total, e.g. leads per status or per source. */
export function LeadBreakdownCard({
  title,
  items,
  total,
  isLoading = false,
  onSelect,
  selectedKey,
}: LeadBreakdownCardProps) {
  return (
    <Paper className="p-4" component="section" aria-label={title}>
      <Typography variant="subtitle1" component="h2" fontWeight={700} className="mb-2">
        {title}
      </Typography>
      <ul className="flex flex-col">
        {items.map((item) => {
          const content = (
            <>
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: markerColor(item.color) }}
              />
              <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
              <span className="text-muted tabular-nums">
                {isLoading ? (
                  <Skeleton width={56} />
                ) : (
                  `${formatNumber(item.count)} (${formatShare(item.count, total)})`
                )}
              </span>
            </>
          );
          const rowClass = 'flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-sm';
          return (
            <li key={item.key}>
              {onSelect ? (
                <button
                  type="button"
                  onClick={() => onSelect(item.key)}
                  aria-pressed={selectedKey === item.key}
                  className={`${rowClass} cursor-pointer hover:bg-[var(--mui-palette-action-hover)] focus-visible:outline-2 focus-visible:outline-[var(--app-primary-strong)] ${
                    selectedKey === item.key
                      ? 'bg-[var(--mui-palette-action-selected)] font-semibold'
                      : ''
                  }`}
                >
                  {content}
                </button>
              ) : (
                <div className={rowClass}>{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </Paper>
  );
}
