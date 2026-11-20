import FilterAltOutlined from '@mui/icons-material/FilterAltOutlined';
import RestartAlt from '@mui/icons-material/RestartAlt';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { Button } from '@/components/common/Button';

import {
  SITE_VISIT_INTERESTS,
  SITE_VISIT_TYPES,
  type PickerOption,
  type SiteVisitInterest,
  type SiteVisitType,
} from '../types/siteVisit.types';
import { SITE_VISIT_INTEREST_META, SITE_VISIT_TYPE_LABELS } from '../utils/siteVisitDisplay';

import { PropertyPicker, UserPicker } from './Pickers';

/** The filters this panel edits; applied together with "Apply filters". */
export interface SiteVisitPanelFilters {
  property: PickerOption | null;
  agent: PickerOption | null;
  visitType: SiteVisitType | '';
  interest: SiteVisitInterest | '';
}

interface SiteVisitFiltersPanelProps {
  /** The filters currently applied; the panel edits a draft copy. Remount (key) to reset the draft. */
  applied: SiteVisitPanelFilters;
  onApply: (filters: SiteVisitPanelFilters) => void;
  onReset: () => void;
  /** Filter by property (needs the property list). */
  showProperty?: boolean;
  /** Filter by agent (needs the user list). */
  showAgent?: boolean;
}

const EMPTY: SiteVisitPanelFilters = { property: null, agent: null, visitType: '', interest: '' };

export function SiteVisitFiltersPanel({
  applied,
  onApply,
  onReset,
  showProperty = false,
  showAgent = false,
}: SiteVisitFiltersPanelProps) {
  const [draft, setDraft] = useState(applied);
  const set = <K extends keyof SiteVisitPanelFilters>(key: K, value: SiteVisitPanelFilters[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  return (
    <section aria-label="Site visit filters" className="flex flex-col gap-3">
      <Typography variant="subtitle1" component="h2" fontWeight={700}>
        Filters
      </Typography>
      {showProperty && (
        <PropertyPicker
          label="Property"
          value={draft.property}
          onChange={(value) => set('property', value)}
          placeholder="All properties"
        />
      )}
      {showAgent && (
        <UserPicker
          label="Agent"
          value={draft.agent}
          onChange={(value) => set('agent', value)}
          placeholder="All agents"
        />
      )}
      <TextField
        select
        size="small"
        label="Visit type"
        value={draft.visitType}
        onChange={(e) =>
          set('visitType', SITE_VISIT_TYPES.find((type) => type === e.target.value) ?? '')
        }
      >
        <MenuItem value="">All types</MenuItem>
        {SITE_VISIT_TYPES.map((type) => (
          <MenuItem key={type} value={type}>
            {SITE_VISIT_TYPE_LABELS[type]}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        size="small"
        label="Interest (from report)"
        value={draft.interest}
        onChange={(e) =>
          set('interest', SITE_VISIT_INTERESTS.find((value) => value === e.target.value) ?? '')
        }
      >
        <MenuItem value="">Any interest</MenuItem>
        {SITE_VISIT_INTERESTS.map((value) => (
          <MenuItem key={value} value={value}>
            {SITE_VISIT_INTEREST_META[value].label}
          </MenuItem>
        ))}
      </TextField>
      <Button startIcon={<FilterAltOutlined />} onClick={() => onApply(draft)} fullWidth>
        Apply filters
      </Button>
      <Button
        variant="text"
        startIcon={<RestartAlt />}
        onClick={() => {
          setDraft(EMPTY);
          onReset();
        }}
        fullWidth
      >
        Reset filters
      </Button>
    </section>
  );
}
