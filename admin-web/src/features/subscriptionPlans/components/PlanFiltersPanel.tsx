import FilterAltOutlined from '@mui/icons-material/FilterAltOutlined';
import RestartAlt from '@mui/icons-material/RestartAlt';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { Button } from '@/components/common/Button';

import { BILLING_INTERVALS } from '../types/subscriptionPlan.types';
import { BILLING_INTERVAL_LABELS } from '../utils/planDisplay';
import { EMPTY_PLAN_PANEL, type PlanPanelFilters } from '../utils/planFilters';

const PRICE = /^\d{0,12}(\.\d{0,2})?$/;

interface PlanFiltersPanelProps {
  /** The filters currently applied; the panel edits a draft copy. Remount (key) to reset it. */
  applied: PlanPanelFilters;
  onApply: (filters: PlanPanelFilters) => void;
  onReset: () => void;
}

export function PlanFiltersPanel({ applied, onApply, onReset }: PlanFiltersPanelProps) {
  const [draft, setDraft] = useState(applied);
  const set = <K extends keyof PlanPanelFilters>(key: K, value: PlanPanelFilters[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const priceInvalid =
    draft.minPrice !== '' &&
    draft.maxPrice !== '' &&
    Number(draft.maxPrice) < Number(draft.minPrice);
  const dateInvalid =
    draft.createdFrom !== '' && draft.createdTo !== '' && draft.createdTo < draft.createdFrom;

  const priceField = (key: 'minPrice' | 'maxPrice', label: string, invalid: boolean) => (
    <TextField
      size="small"
      label={label}
      value={draft[key]}
      onChange={(event) => {
        if (PRICE.test(event.target.value)) set(key, event.target.value);
      }}
      error={invalid}
      helperText={invalid ? 'Below the minimum' : undefined}
      slotProps={{
        htmlInput: { inputMode: 'decimal' },
      }}
    />
  );

  return (
    <section aria-label="Plan filters" className="flex flex-col gap-4">
      <Typography variant="subtitle1" component="h2" fontWeight={700}>
        Filters
      </Typography>
      <TextField
        select
        size="small"
        label="Billing interval"
        value={draft.billingInterval}
        onChange={(e) =>
          set('billingInterval', BILLING_INTERVALS.find((value) => value === e.target.value) ?? '')
        }
      >
        <MenuItem value="">All intervals</MenuItem>
        {BILLING_INTERVALS.map((value) => (
          <MenuItem key={value} value={value}>
            {BILLING_INTERVAL_LABELS[value]}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        size="small"
        label="Popular"
        value={draft.popular}
        onChange={(e) =>
          set('popular', e.target.value === 'yes' || e.target.value === 'no' ? e.target.value : '')
        }
      >
        <MenuItem value="">All plans</MenuItem>
        <MenuItem value="yes">Popular only</MenuItem>
        <MenuItem value="no">Not popular</MenuItem>
      </TextField>
      <fieldset className="flex flex-col gap-2">
        <Typography component="legend" variant="body2" fontWeight={600} className="mb-2">
          Price range
        </Typography>
        <div className="grid grid-cols-2 gap-2">
          {priceField('minPrice', 'Min price', false)}
          {priceField('maxPrice', 'Max price', priceInvalid)}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <Typography component="legend" variant="body2" fontWeight={600} className="mb-2">
          Created between
        </Typography>
        <div className="grid grid-cols-2 gap-2">
          <TextField
            size="small"
            type="date"
            label="From"
            value={draft.createdFrom}
            onChange={(e) => set('createdFrom', e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            size="small"
            type="date"
            label="To"
            value={draft.createdTo}
            onChange={(e) => set('createdTo', e.target.value)}
            error={dateInvalid}
            helperText={dateInvalid ? 'Before the start date' : undefined}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { min: draft.createdFrom || undefined },
            }}
          />
        </div>
      </fieldset>
      <Button
        startIcon={<FilterAltOutlined />}
        onClick={() => onApply(draft)}
        disabled={priceInvalid || dateInvalid}
        fullWidth
      >
        Apply filters
      </Button>
      <Button
        variant="text"
        startIcon={<RestartAlt />}
        onClick={() => {
          setDraft(EMPTY_PLAN_PANEL);
          onReset();
        }}
        fullWidth
      >
        Reset filters
      </Button>
    </section>
  );
}
