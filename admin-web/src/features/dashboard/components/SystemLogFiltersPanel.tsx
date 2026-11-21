import FilterAltOutlined from '@mui/icons-material/FilterAltOutlined';
import RestartAlt from '@mui/icons-material/RestartAlt';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { Button } from '@/components/common/Button';
import { DateRangeFields } from '@/components/common/DateRangeFields';
import type { ToolbarOption } from '@/components/common/ListToolbar';
import type { PickerOption } from '@/components/common/SearchAutocomplete';

import { SYSTEM_LOG_LEVELS, type SystemLogLevel } from '../types/systemLog.types';
import {
  DATE_RANGE_LABELS,
  DATE_RANGE_PRESETS,
  type DateRange,
  type DateRangePreset,
  SYSTEM_LOG_LEVEL_OPTIONS,
  SYSTEM_LOG_SORT_OPTIONS,
} from '../utils/systemLogDisplay';

import { SystemLogUserPicker } from './SystemLogUserPicker';

/** The filters this panel edits; applied together with "Apply filters". */
export interface SystemLogPanelFilters {
  module: string;
  logLevel: SystemLogLevel | '';
  user: PickerOption | null;
  range: DateRange;
  /** Digits as typed; empty for none. */
  referenceId: string;
  /** `field,direction`. */
  sort: string;
}

interface SystemLogFiltersPanelProps {
  /** The filters currently applied; the panel edits a draft copy. Remount (key) to reset the draft. */
  applied: SystemLogPanelFilters;
  onApply: (filters: SystemLogPanelFilters) => void;
  onReset: () => void;
  moduleOptions: readonly ToolbarOption[];
  /** Filter by user (needs the user management list). */
  showUser?: boolean;
}

function isPreset(value: string): value is DateRangePreset {
  return DATE_RANGE_PRESETS.some((preset) => preset === value);
}

/** Why the draft cannot be applied, or null. */
function rangeError(range: DateRange): string | null {
  if (range.preset !== 'custom') return null;
  if (!range.from && !range.to) return 'Choose a start or end date.';
  if (range.from && range.to && range.to < range.from) return 'The end date is before the start.';
  return null;
}

export function SystemLogFiltersPanel({
  applied,
  onApply,
  onReset,
  moduleOptions,
  showUser = false,
}: SystemLogFiltersPanelProps) {
  const [draft, setDraft] = useState(applied);
  const [submitted, setSubmitted] = useState(false);
  const set = <K extends keyof SystemLogPanelFilters>(key: K, value: SystemLogPanelFilters[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const setRange = (changes: Partial<DateRange>) =>
    setDraft((current) => ({ ...current, range: { ...current.range, ...changes } }));
  const error = rangeError(draft.range);

  const handleApply = () => {
    setSubmitted(true);
    if (!error) onApply(draft);
  };

  return (
    <section aria-label="System log filters" className="flex flex-col gap-4">
      <Typography variant="subtitle1" component="h2" fontWeight={700}>
        Filters
      </Typography>
      <TextField
        select
        size="small"
        label="Module"
        value={draft.module}
        onChange={(event) => set('module', event.target.value)}
      >
        <MenuItem value="">All modules</MenuItem>
        {moduleOptions.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        size="small"
        label="Log level"
        value={draft.logLevel}
        onChange={(event) =>
          set('logLevel', SYSTEM_LOG_LEVELS.find((level) => level === event.target.value) ?? '')
        }
      >
        <MenuItem value="">All levels</MenuItem>
        {SYSTEM_LOG_LEVEL_OPTIONS.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
      {showUser && (
        <SystemLogUserPicker
          label="User"
          value={draft.user}
          onChange={(value) => set('user', value)}
          placeholder="All users"
        />
      )}
      <TextField
        select
        size="small"
        label="Date range"
        value={draft.range.preset ?? ''}
        onChange={(event) =>
          setRange({ preset: isPreset(event.target.value) ? event.target.value : undefined })
        }
      >
        <MenuItem value="">Any time</MenuItem>
        {DATE_RANGE_PRESETS.map((preset) => (
          <MenuItem key={preset} value={preset}>
            {DATE_RANGE_LABELS[preset]}
          </MenuItem>
        ))}
      </TextField>
      {draft.range.preset === 'custom' && (
        <div>
          <DateRangeFields
            legend="Custom range"
            from={draft.range.from ?? ''}
            to={draft.range.to ?? ''}
            onFromChange={(from) => setRange({ from: from || undefined })}
            onToChange={(to) => setRange({ to: to || undefined })}
          />
          {submitted && error && (
            <Typography variant="caption" color="error" role="alert" component="p" className="mt-1">
              {error}
            </Typography>
          )}
        </div>
      )}
      <TextField
        size="small"
        label="Reference ID"
        placeholder="e.g. 12"
        value={draft.referenceId}
        onChange={(event) => set('referenceId', event.target.value.replace(/\D/g, '').slice(0, 15))}
        helperText="The id of the affected record"
        slotProps={{ htmlInput: { inputMode: 'numeric' } }}
      />
      <TextField
        select
        size="small"
        label="Sort by"
        value={draft.sort}
        onChange={(event) => set('sort', event.target.value)}
      >
        {SYSTEM_LOG_SORT_OPTIONS.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
      <Button startIcon={<FilterAltOutlined />} onClick={handleApply} fullWidth>
        Apply filters
      </Button>
      <Button variant="text" startIcon={<RestartAlt />} onClick={onReset} fullWidth>
        Reset filters
      </Button>
    </section>
  );
}
