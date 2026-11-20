import Add from '@mui/icons-material/Add';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import ArrowUpward from '@mui/icons-material/ArrowUpward';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import FormHelperText from '@mui/material/FormHelperText';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { type KeyboardEvent, useState } from 'react';
import { type Control, useFieldArray, useFormState } from 'react-hook-form';

import { Button } from '@/components/common/Button';
import { FormTextField } from '@/components/common/Input';

import type { PlanFormValues } from '../schemas/planSchema';

interface FeatureListFieldProps {
  control: Control<PlanFormValues>;
  /** Maximum number of entries (the backend's `MAX_FEATURES`). */
  max: number;
  /** Maximum length of one entry. */
  maxLength: number;
  disabled?: boolean;
}

/** Ordered, editable list of a plan's display features. */
export function FeatureListField({
  control,
  max,
  maxLength,
  disabled = false,
}: FeatureListFieldProps) {
  const { fields, append, remove, move } = useFieldArray({ control, name: 'features' });
  const { errors } = useFormState({ control, name: 'features' });
  const [draft, setDraft] = useState('');
  const full = fields.length >= max;
  // A server error for the whole list ("must not contain duplicates") sits on the array itself.
  const listError = errors.features?.message ?? errors.features?.root?.message;

  const add = () => {
    const value = draft.trim();
    if (!value || full) return;
    append({ value });
    setDraft('');
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      add();
    }
  };

  return (
    <fieldset className="flex flex-col gap-3" disabled={disabled}>
      <div className="flex items-baseline justify-between gap-2">
        <Typography component="legend" variant="subtitle2" fontWeight={700}>
          Included features
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {fields.length} / {max}
        </Typography>
      </div>
      {fields.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No features yet. They are shown to users on the plan card.
        </Typography>
      )}
      <ol className="flex flex-col gap-2">
        {fields.map((field, index) => (
          <li key={field.id} className="flex items-start gap-1">
            <FormTextField
              control={control}
              name={`features.${index}.value`}
              size="small"
              fullWidth
              slotProps={{
                htmlInput: { maxLength, 'aria-label': `Feature ${index + 1}` },
              }}
            />
            <Tooltip title="Move up">
              <span>
                <IconButton
                  size="small"
                  aria-label={`Move feature ${index + 1} up`}
                  disabled={index === 0}
                  onClick={() => move(index, index - 1)}
                >
                  <ArrowUpward fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Move down">
              <span>
                <IconButton
                  size="small"
                  aria-label={`Move feature ${index + 1} down`}
                  disabled={index === fields.length - 1}
                  onClick={() => move(index, index + 1)}
                >
                  <ArrowDownward fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Remove">
              <IconButton
                size="small"
                aria-label={`Remove feature ${index + 1}`}
                onClick={() => remove(index)}
              >
                <DeleteOutline fontSize="small" />
              </IconButton>
            </Tooltip>
          </li>
        ))}
      </ol>
      <div className="flex items-start gap-2">
        <TextField
          size="small"
          fullWidth
          label="New feature"
          placeholder="e.g. Featured listing badge"
          value={draft}
          disabled={full}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          slotProps={{ htmlInput: { maxLength } }}
        />
        <Button
          variant="outlined"
          startIcon={<Add />}
          onClick={add}
          disabled={full || !draft.trim()}
        >
          Add
        </Button>
      </div>
      {full && <FormHelperText>The maximum of {max} features is reached.</FormHelperText>}
      {listError && <FormHelperText error>{listError}</FormHelperText>}
    </fieldset>
  );
}
