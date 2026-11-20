import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Controller, useFormContext, useWatch } from 'react-hook-form';

import { FormTextField } from '@/components/common/Input';

import { PLAN_LIMITS, type PlanFormValues } from '../schemas/planSchema';
import { BILLING_INTERVALS } from '../types/subscriptionPlan.types';
import {
  BILLING_INTERVAL_LABELS,
  billingCycleLabel,
  monthlyEquivalent,
  type PlanPricing,
  planPriceLabel,
  trialLabel,
} from '../utils/planDisplay';

const PRICE = /^\d{1,12}(\.\d{1,2})?$/;

/** Price, currency, billing period and trial, with a live preview of what users are charged. */
export function PlanPricingFields() {
  const { control, setValue } = useFormContext<PlanFormValues>();
  const [price, currency, interval, count, trialDays] = useWatch({
    control,
    name: ['price', 'currency', 'billingInterval', 'billingIntervalCount', 'trialDays'],
  });
  const isLifetime = interval === 'lifetime';
  const countNumber = Number(count);
  const validCount = /^\d+$/.test(count) && countNumber >= 1;
  const preview: PlanPricing | null =
    PRICE.test(price.trim()) && /^[A-Z]{3}$/.test(currency.trim()) && validCount
      ? {
          price: Number(price),
          currency: currency.trim(),
          billingInterval: interval,
          billingIntervalCount: countNumber,
        }
      : null;
  const perMonth = preview ? monthlyEquivalent(preview) : null;

  return (
    <section aria-label="Pricing and billing" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Typography variant="subtitle2" component="h3" fontWeight={700} className="sm:col-span-2">
        Pricing and billing
      </Typography>
      <FormTextField
        control={control}
        name="price"
        label="Price"
        required
        helperText="0 for a free plan"
        slotProps={{
          htmlInput: { inputMode: 'decimal' },
          input: {
            startAdornment: <InputAdornment position="start">{currency || '—'}</InputAdornment>,
          },
        }}
      />
      <Controller
        control={control}
        name="currency"
        render={({ field: { ref, onChange, ...field }, fieldState: { error } }) => (
          <TextField
            {...field}
            inputRef={ref}
            label="Currency"
            required
            onChange={(event) => onChange(event.target.value.toUpperCase())}
            error={Boolean(error)}
            helperText={error?.message ?? 'ISO 4217 code, e.g. INR, USD'}
            slotProps={{ htmlInput: { maxLength: 3, autoCapitalize: 'characters' } }}
          />
        )}
      />
      <Controller
        control={control}
        name="billingInterval"
        render={({ field: { ref, onChange, ...field } }) => (
          <TextField
            {...field}
            inputRef={ref}
            select
            label="Billing unit"
            onChange={(event) => {
              const next =
                BILLING_INTERVALS.find((value) => value === event.target.value) ?? 'month';
              onChange(next);
              // Lifetime plans are charged once; the backend requires a period of 1.
              if (next === 'lifetime') {
                setValue('billingIntervalCount', '1', { shouldDirty: true, shouldValidate: true });
              }
            }}
          >
            {BILLING_INTERVALS.map((value) => (
              <MenuItem key={value} value={value}>
                {BILLING_INTERVAL_LABELS[value]}
              </MenuItem>
            ))}
          </TextField>
        )}
      />
      <FormTextField
        control={control}
        name="billingIntervalCount"
        label={isLifetime ? 'Billing period' : `Every how many ${interval}s`}
        disabled={isLifetime}
        helperText={
          validCount
            ? `Billed ${billingCycleLabel(interval, countNumber).toLowerCase()}`
            : undefined
        }
        slotProps={{
          htmlInput: { inputMode: 'numeric', min: 1, max: PLAN_LIMITS.maxBillingIntervalCount },
        }}
      />
      <FormTextField
        control={control}
        name="trialDays"
        label="Trial period (days)"
        helperText="0 for no trial"
        slotProps={{ htmlInput: { inputMode: 'numeric', min: 0, max: PLAN_LIMITS.maxTrialDays } }}
      />
      <Paper
        variant="outlined"
        className="flex flex-col justify-center px-4 py-3"
        aria-live="polite"
        sx={{ bgcolor: 'rgba(var(--mui-palette-primary-mainChannel) / 0.05)' }}
      >
        <Typography variant="caption" color="text.secondary">
          Users are charged
        </Typography>
        <Typography variant="subtitle1" fontWeight={700}>
          {preview ? planPriceLabel(preview) : '—'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {[perMonth && `≈ ${perMonth}`, /^\d+$/.test(trialDays) && trialLabel(Number(trialDays))]
            .filter(Boolean)
            .join(' · ')}
        </Typography>
      </Paper>
    </section>
  );
}
