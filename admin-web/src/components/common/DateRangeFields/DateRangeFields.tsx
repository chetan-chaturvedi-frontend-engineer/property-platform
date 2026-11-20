import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

interface DateRangeFieldsProps {
  legend: string;
  /** `yyyy-MM-dd` or empty. */
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}

/** "From" / "To" date inputs under a legend; flags an end before the start. */
export function DateRangeFields({
  legend,
  from,
  to,
  onFromChange,
  onToChange,
}: DateRangeFieldsProps) {
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
