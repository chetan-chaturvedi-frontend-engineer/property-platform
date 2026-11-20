import FilterAltOutlined from '@mui/icons-material/FilterAltOutlined';
import RestartAlt from '@mui/icons-material/RestartAlt';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { Button } from '@/components/common/Button';

import type { LeadPriority, LeadPropertyType, LeadPurpose, LeadSource } from '../types/lead.types';
import {
  LEAD_PRIORITY_META,
  LEAD_PROPERTY_TYPE_LABELS,
  LEAD_PURPOSE_LABELS,
  LEAD_SOURCE_LABELS,
} from '../utils/leadDisplay';

import { EMPTY_PANEL_FILTERS, type LeadPanelFilters } from '../utils/leadFilters';

import { AssigneeAutocomplete } from './AssigneeAutocomplete';

interface LeadFiltersPanelProps {
  /** The filters currently applied; the panel edits a draft copy. Remount (key) to reset the draft. */
  applied: LeadPanelFilters;
  onApply: (filters: LeadPanelFilters) => void;
  onReset: () => void;
  /** Filter by assignee (needs the user list). */
  showAssignee?: boolean;
}

const LOCATION_MAX_LENGTH = 100;

function choices<T extends string>(labels: Record<T, string>) {
  return Object.entries<string>(labels).map(([value, label]) => (
    <MenuItem key={value} value={value}>
      {label}
    </MenuItem>
  ));
}

export function LeadFiltersPanel({
  applied,
  onApply,
  onReset,
  showAssignee = false,
}: LeadFiltersPanelProps) {
  const [draft, setDraft] = useState(applied);
  const set = <K extends keyof LeadPanelFilters>(key: K, value: LeadPanelFilters[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  // Same rule as the backend: the end of the range must not be before its start.
  const rangeIsValid =
    !draft.createdFrom || !draft.createdTo || draft.createdFrom <= draft.createdTo;

  const handleApply = () => {
    if (rangeIsValid) onApply({ ...draft, preferredLocation: draft.preferredLocation.trim() });
  };

  return (
    <section aria-label="Lead filters" className="flex flex-col gap-3">
      <Typography variant="subtitle1" component="h2" fontWeight={700}>
        Filters
      </Typography>
      <TextField
        select
        size="small"
        label="Source"
        value={draft.source}
        onChange={(e) => set('source', LEAD_SOURCE_KEYS.find((k) => k === e.target.value) ?? '')}
      >
        <MenuItem value="">All sources</MenuItem>
        {choices(LEAD_SOURCE_LABELS)}
      </TextField>
      <TextField
        select
        size="small"
        label="Priority"
        value={draft.priority}
        onChange={(e) => set('priority', PRIORITY_KEYS.find((k) => k === e.target.value) ?? '')}
      >
        <MenuItem value="">Any priority</MenuItem>
        {PRIORITY_KEYS.map((key) => (
          <MenuItem key={key} value={key}>
            {LEAD_PRIORITY_META[key].label}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        size="small"
        label="Purpose"
        value={draft.purpose}
        onChange={(e) => set('purpose', PURPOSE_KEYS.find((k) => k === e.target.value) ?? '')}
      >
        <MenuItem value="">Any purpose</MenuItem>
        {choices(LEAD_PURPOSE_LABELS)}
      </TextField>
      <TextField
        select
        size="small"
        label="Property type"
        value={draft.propertyType}
        onChange={(e) => set('propertyType', TYPE_KEYS.find((k) => k === e.target.value) ?? '')}
      >
        <MenuItem value="">All types</MenuItem>
        {choices(LEAD_PROPERTY_TYPE_LABELS)}
      </TextField>
      {showAssignee && (
        <AssigneeAutocomplete
          value={draft.assignee}
          onChange={(value) => set('assignee', value)}
          label="Assigned to"
        />
      )}
      <TextField
        size="small"
        label="Preferred location"
        value={draft.preferredLocation}
        onChange={(e) => set('preferredLocation', e.target.value)}
        slotProps={{ htmlInput: { maxLength: LOCATION_MAX_LENGTH } }}
      />
      <div className="grid grid-cols-2 gap-2">
        <TextField
          size="small"
          type="date"
          label="Created from"
          value={draft.createdFrom}
          onChange={(e) => set('createdFrom', e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          size="small"
          type="date"
          label="Created to"
          value={draft.createdTo}
          onChange={(e) => set('createdTo', e.target.value)}
          error={!rangeIsValid}
          helperText={rangeIsValid ? undefined : 'Before the start date'}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </div>
      <Button
        startIcon={<FilterAltOutlined />}
        onClick={handleApply}
        disabled={!rangeIsValid}
        fullWidth
      >
        Apply filters
      </Button>
      <Button
        variant="text"
        startIcon={<RestartAlt />}
        onClick={() => {
          setDraft(EMPTY_PANEL_FILTERS);
          onReset();
        }}
        fullWidth
      >
        Reset filters
      </Button>
    </section>
  );
}

const LEAD_SOURCE_KEYS = Object.keys(LEAD_SOURCE_LABELS).filter(isSource);
const PRIORITY_KEYS = Object.keys(LEAD_PRIORITY_META).filter(isPriority);
const PURPOSE_KEYS = Object.keys(LEAD_PURPOSE_LABELS).filter(isPurpose);
const TYPE_KEYS = Object.keys(LEAD_PROPERTY_TYPE_LABELS).filter(isPropertyType);

function isSource(value: string): value is LeadSource {
  return value in LEAD_SOURCE_LABELS;
}
function isPriority(value: string): value is LeadPriority {
  return value in LEAD_PRIORITY_META;
}
function isPurpose(value: string): value is LeadPurpose {
  return value in LEAD_PURPOSE_LABELS;
}
function isPropertyType(value: string): value is LeadPropertyType {
  return value in LEAD_PROPERTY_TYPE_LABELS;
}
