import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { formatNumber } from '@/utils/formatters';
import { cn } from '@/utils/helpers';

import { type ChipColor, formatShare } from '../utils/siteVisitDisplay';

export interface DonutItem {
  key: string;
  label: string;
  count: number;
  /** Theme palette color of the segment and its marker. */
  color: ChipColor;
}

interface DonutChartCardProps {
  title: string;
  items: readonly DonutItem[];
  total: number;
  isLoading?: boolean;
  /** Text under the total in the middle of the ring. */
  centerLabel?: string;
  /** Legend rows become buttons that apply that filter. */
  onSelect?: (key: string) => void;
  /** The key of the filter currently applied, highlighted in the legend. */
  selectedKey?: string;
}

const SIZE = 132;
const STROKE = 20;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Arc length and start of each non-empty item along the ring. */
function toSegments(items: readonly DonutItem[], total: number) {
  const segments: Array<DonutItem & { length: number; offset: number }> = [];
  let offset = 0;
  for (const item of items) {
    if (item.count <= 0 || total <= 0) continue;
    const length = (item.count / total) * CIRCUMFERENCE;
    segments.push({ ...item, length, offset });
    offset += length;
  }
  return segments;
}

const paletteColor = (color: ChipColor) =>
  color === 'default' ? 'var(--mui-palette-text-disabled)' : `var(--mui-palette-${color}-main)`;

/**
 * Doughnut chart with a legend of counts and shares. Drawn as SVG strokes, so it needs no chart
 * library; the legend carries the numbers, so the chart itself is hidden from screen readers.
 */
export function DonutChartCard({
  title,
  items,
  total,
  isLoading = false,
  centerLabel = 'Total',
  onSelect,
  selectedKey,
}: DonutChartCardProps) {
  const segments = toSegments(items, total);

  return (
    <Paper className="p-4" component="section" aria-label={title}>
      <Typography variant="subtitle1" component="h2" fontWeight={700} className="mb-3">
        {title}
      </Typography>
      <div className="flex flex-col items-center gap-4 sm:flex-row xl:flex-col 2xl:flex-row">
        <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
          {isLoading ? (
            <Skeleton variant="circular" width={SIZE} height={SIZE} />
          ) : (
            <svg
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              width={SIZE}
              height={SIZE}
              aria-hidden
              className="-rotate-90"
            >
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                strokeWidth={STROKE}
                stroke="var(--mui-palette-action-hover)"
              />
              {segments.map((segment) => (
                <circle
                  key={segment.key}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  strokeWidth={STROKE}
                  stroke={paletteColor(segment.color)}
                  strokeDasharray={`${segment.length} ${CIRCUMFERENCE - segment.length}`}
                  strokeDashoffset={-segment.offset}
                  opacity={selectedKey && selectedKey !== segment.key ? 0.35 : 1}
                />
              ))}
            </svg>
          )}
          {!isLoading && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold tabular-nums">{formatNumber(total)}</span>
              <span className="text-muted text-xs">{centerLabel}</span>
            </div>
          )}
        </div>
        <ul className="flex w-full min-w-0 flex-col">
          {items.map((item) => {
            const content = (
              <>
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: paletteColor(item.color) }}
                />
                <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                <span className="text-muted whitespace-nowrap tabular-nums">
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
                    className={cn(
                      rowClass,
                      'cursor-pointer hover:bg-[var(--mui-palette-action-hover)] focus-visible:outline-2 focus-visible:outline-[var(--app-primary-strong)]',
                      selectedKey === item.key &&
                        'bg-[var(--mui-palette-action-selected)] font-semibold',
                    )}
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
      </div>
    </Paper>
  );
}
