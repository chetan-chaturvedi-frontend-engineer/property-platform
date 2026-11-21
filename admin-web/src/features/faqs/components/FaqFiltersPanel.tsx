import FilterAltOutlined from '@mui/icons-material/FilterAltOutlined';
import RestartAlt from '@mui/icons-material/RestartAlt';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { Button } from '@/components/common/Button';
import type { ToolbarOption } from '@/components/common/ListToolbar';

/** The filters the panel edits; applied together with "Apply filters". Empty = all. */
export interface FaqPanelFilters {
  category: string;
  status: string;
  /** `field,direction`. */
  sort: string;
}

interface FaqFiltersPanelProps {
  /** The filters currently applied; the panel edits a draft copy. Remount (key) to reset it. */
  applied: FaqPanelFilters;
  categoryOptions: readonly ToolbarOption[];
  statusOptions: readonly ToolbarOption[];
  sortOptions: readonly ToolbarOption[];
  onApply: (filters: FaqPanelFilters) => void;
  onReset: () => void;
}

interface PanelSelectProps {
  label: string;
  value: string;
  options: readonly ToolbarOption[];
  /** Label of the empty choice; omitted when a value is always required. */
  allLabel?: string;
  onChange: (value: string) => void;
}

function PanelSelect({ label, value, options, allLabel, onChange }: PanelSelectProps) {
  return (
    <TextField
      select
      size="small"
      label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      fullWidth
    >
      {allLabel !== undefined && <MenuItem value="">{allLabel}</MenuItem>}
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

/** Side panel with every list filter and the sort order, applied in one step. */
export function FaqFiltersPanel({
  applied,
  categoryOptions,
  statusOptions,
  sortOptions,
  onApply,
  onReset,
}: FaqFiltersPanelProps) {
  const [draft, setDraft] = useState(applied);
  const set = (key: keyof FaqPanelFilters, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));

  return (
    <section aria-label="FAQ filters" className="flex flex-col gap-4">
      <Typography variant="subtitle1" component="h2" fontWeight={700}>
        Filters
      </Typography>
      <PanelSelect
        label="Category"
        value={draft.category}
        options={categoryOptions}
        allLabel="All categories"
        onChange={(value) => set('category', value)}
      />
      <PanelSelect
        label="Status"
        value={draft.status}
        options={statusOptions}
        allLabel="All statuses"
        onChange={(value) => set('status', value)}
      />
      <PanelSelect
        label="Sort by"
        value={draft.sort}
        options={sortOptions}
        onChange={(value) => set('sort', value)}
      />
      <Button startIcon={<FilterAltOutlined />} onClick={() => onApply(draft)} fullWidth>
        Apply filters
      </Button>
      <Button variant="text" startIcon={<RestartAlt />} onClick={onReset} fullWidth>
        Reset filters
      </Button>
    </section>
  );
}
