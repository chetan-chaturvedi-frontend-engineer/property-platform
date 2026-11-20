import Cancel from '@mui/icons-material/Cancel';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';

import type { FilterChip } from '../utils/planFilters';

interface ActiveFilterChipsProps {
  filters: readonly FilterChip[];
}

/** The applied filters as removable chips; renders nothing when none is applied. */
export function ActiveFilterChips({ filters }: ActiveFilterChipsProps) {
  if (filters.length === 0) return null;
  return (
    <div
      role="region"
      aria-label="Applied filters"
      className="flex flex-wrap items-center gap-2 px-4 pb-3"
    >
      <Typography variant="caption" color="text.secondary" fontWeight={600}>
        Applied:
      </Typography>
      {filters.map((filter) => (
        <Chip
          key={filter.key}
          size="small"
          label={filter.label}
          onDelete={filter.onRemove}
          deleteIcon={<Cancel aria-label={`Remove filter ${filter.label}`} aria-hidden={false} />}
        />
      ))}
    </div>
  );
}
