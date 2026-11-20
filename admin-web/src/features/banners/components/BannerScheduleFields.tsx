import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { Controller, useFormContext, useWatch } from 'react-hook-form';

import { FormTextField } from '@/components/common/Input';

import type { BannerFormValues } from '../schemas/bannerSchema';

interface BannerScheduleFieldsProps {
  /** IANA zone the date inputs are in (the browser's), shown to avoid surprises. */
  timeZone: string;
  disabled?: boolean;
}

/** The schedule toggle and its start/end date-time inputs. */
export function BannerScheduleFields({ timeZone, disabled = false }: BannerScheduleFieldsProps) {
  const { control, clearErrors } = useFormContext<BannerFormValues>();
  const scheduled = useWatch({ control, name: 'scheduled' });
  const startDate = useWatch({ control, name: 'startDate' });

  return (
    <div className="flex flex-col gap-3">
      <Controller
        name="scheduled"
        control={control}
        render={({ field: { value, onChange, ref } }) => (
          <FormControlLabel
            control={
              <Switch
                checked={value}
                inputRef={ref}
                disabled={disabled}
                onChange={(event) => {
                  onChange(event.target.checked);
                  if (!event.target.checked) clearErrors(['startDate', 'endDate']);
                }}
              />
            }
            label={
              <span>
                <Typography variant="body2" fontWeight={600} component="span" className="block">
                  Schedule banner
                </Typography>
                <Typography variant="caption" color="text.secondary" component="span">
                  Set start and end date for banner display.
                </Typography>
              </span>
            }
          />
        )}
      />
      {scheduled ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormTextField
              name="startDate"
              control={control}
              type="datetime-local"
              label="Start date"
              disabled={disabled}
              helperText="Empty = shown as soon as it is active"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <FormTextField
              name="endDate"
              control={control}
              type="datetime-local"
              label="End date"
              disabled={disabled}
              helperText="Empty = no end date"
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { min: startDate || undefined },
              }}
            />
          </div>
          <Typography variant="caption" color="text.secondary">
            Times are in your time zone ({timeZone}). Both dates are inclusive; the server clock
            decides when the banner starts and ends.
          </Typography>
        </>
      ) : (
        <Typography variant="caption" color="text.secondary">
          Without a schedule, the banner is shown for as long as it is active.
        </Typography>
      )}
    </div>
  );
}
