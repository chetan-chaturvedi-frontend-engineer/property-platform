import FilterAltOutlined from '@mui/icons-material/FilterAltOutlined';
import RestartAlt from '@mui/icons-material/RestartAlt';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { Button } from '@/components/common/Button';
import type { ToolbarOption } from '@/components/common/ListToolbar';

/** One dropdown of the panel. */
export interface FiltersPanelField<K extends string> {
  id: K;
  label: string;
  options: readonly ToolbarOption[];
  /** Label of the empty choice ("All statuses"); omitted when a value is always required. */
  allLabel?: string;
}

interface FiltersPanelProps<K extends string> {
  /** Accessible name of the panel, e.g. "Page filters". */
  label: string;
  fields: ReadonlyArray<FiltersPanelField<K>>;
  /** The values currently applied; the panel edits a draft copy. Remount (key) to reset it. */
  applied: Record<K, string>;
  onApply: (values: Record<K, string>) => void;
  onReset: () => void;
}

/** Side panel with list filters and the sort order, applied together with "Apply filters". */
export function FiltersPanel<K extends string>({
  label,
  fields,
  applied,
  onApply,
  onReset,
}: FiltersPanelProps<K>) {
  const [draft, setDraft] = useState(applied);

  return (
    <section aria-label={label} className="flex flex-col gap-4">
      <Typography variant="subtitle1" component="h2" fontWeight={700}>
        Filters
      </Typography>
      {fields.map((field) => (
        <TextField
          key={field.id}
          select
          size="small"
          label={field.label}
          value={draft[field.id]}
          onChange={(event) =>
            setDraft((current) => ({ ...current, [field.id]: event.target.value }))
          }
          fullWidth
        >
          {field.allLabel !== undefined && <MenuItem value="">{field.allLabel}</MenuItem>}
          {field.options.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      ))}
      <Button startIcon={<FilterAltOutlined />} onClick={() => onApply(draft)} fullWidth>
        Apply filters
      </Button>
      <Button variant="text" startIcon={<RestartAlt />} onClick={onReset} fullWidth>
        Reset filters
      </Button>
    </section>
  );
}
