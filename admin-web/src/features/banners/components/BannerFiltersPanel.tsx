import FilterAltOutlined from '@mui/icons-material/FilterAltOutlined';
import RestartAlt from '@mui/icons-material/RestartAlt';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { Button } from '@/components/common/Button';

import { BANNER_LINK_TYPES } from '../types/banner.types';
import {
  type BannerPanelFilters,
  EMPTY_BANNER_PANEL,
  LINK_TYPE_LABELS,
} from '../utils/bannerFilters';

interface DateRangeProps {
  legend: string;
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}

function DateRange({ legend, from, to, onFromChange, onToChange }: DateRangeProps) {
  const invalid = from !== '' && to !== '' && to < from;
  return (
    <fieldset className="flex flex-col gap-2">
      <Typography component="legend" variant="body2" fontWeight={600} className="mb-2">
        {legend}
      </Typography>
      <div className="grid grid-cols-2 gap-2">
        <TextField
          size="small"
          type="date"
          label="From"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          size="small"
          type="date"
          label="To"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          error={invalid}
          helperText={invalid ? 'Before the start date' : undefined}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: from || undefined } }}
        />
      </div>
    </fieldset>
  );
}

interface BannerFiltersPanelProps {
  /** The filters currently applied; the panel edits a draft copy. Remount (key) to reset it. */
  applied: BannerPanelFilters;
  onApply: (filters: BannerPanelFilters) => void;
  onReset: () => void;
}

export function BannerFiltersPanel({ applied, onApply, onReset }: BannerFiltersPanelProps) {
  const [draft, setDraft] = useState(applied);
  const set = <K extends keyof BannerPanelFilters>(key: K, value: BannerPanelFilters[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const invalid =
    (draft.startFrom !== '' && draft.startTo !== '' && draft.startTo < draft.startFrom) ||
    (draft.endFrom !== '' && draft.endTo !== '' && draft.endTo < draft.endFrom);

  return (
    <section aria-label="Banner filters" className="flex flex-col gap-4">
      <Typography variant="subtitle1" component="h2" fontWeight={700}>
        Filters
      </Typography>
      <TextField
        select
        size="small"
        label="Link type"
        value={draft.linkType}
        onChange={(e) =>
          set('linkType', BANNER_LINK_TYPES.find((value) => value === e.target.value) ?? '')
        }
      >
        <MenuItem value="">All links</MenuItem>
        {BANNER_LINK_TYPES.map((value) => (
          <MenuItem key={value} value={value}>
            {LINK_TYPE_LABELS[value]}
          </MenuItem>
        ))}
      </TextField>
      <DateRange
        legend="Starts between"
        from={draft.startFrom}
        to={draft.startTo}
        onFromChange={(value) => set('startFrom', value)}
        onToChange={(value) => set('startTo', value)}
      />
      <DateRange
        legend="Ends between"
        from={draft.endFrom}
        to={draft.endTo}
        onFromChange={(value) => set('endFrom', value)}
        onToChange={(value) => set('endTo', value)}
      />
      <Typography variant="caption" color="text.secondary">
        Date filters only match banners that have that date set; banners without a schedule are left
        out.
      </Typography>
      <Button
        startIcon={<FilterAltOutlined />}
        onClick={() => onApply(draft)}
        disabled={invalid}
        fullWidth
      >
        Apply filters
      </Button>
      <Button
        variant="text"
        startIcon={<RestartAlt />}
        onClick={() => {
          setDraft(EMPTY_BANNER_PANEL);
          onReset();
        }}
        fullWidth
      >
        Reset filters
      </Button>
    </section>
  );
}
