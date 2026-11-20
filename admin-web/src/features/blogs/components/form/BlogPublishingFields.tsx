import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Typography from '@mui/material/Typography';
import { Controller, useFormContext, useWatch } from 'react-hook-form';

import { FormTextField } from '@/components/common/Input';
import { formatDateTime } from '@/utils/formatters';

import type { BlogFormValues, PublishMode } from '../../schemas/blogSchema';
import type { BlogPublicState } from '../../types/blog.types';
import { BlogStateChip } from '../BlogStateChip';

const MODE_LABELS: Record<PublishMode, string> = {
  now: 'Publish immediately',
  schedule: 'Schedule for later',
  keep: 'Keep the current publication date',
};

interface BlogPublishingFieldsProps {
  /** Choices offered for this blog (`keep` only for already published ones). */
  modes: readonly PublishMode[];
  /** State and time of the saved blog, when editing. */
  saved?: { publicState: BlogPublicState; publishedAt: string | null };
  /** IANA name shown next to the time input, e.g. "Asia/Kolkata". */
  timeZone: string;
  disabled?: boolean;
}

/** When the blog goes live once it is published; drafts ignore it. */
export function BlogPublishingFields({
  modes,
  saved,
  timeZone,
  disabled = false,
}: BlogPublishingFieldsProps) {
  const { control } = useFormContext<BlogFormValues>();
  const mode = useWatch({ control, name: 'publishMode' });

  return (
    <div className="flex flex-col gap-3">
      {saved && (
        <div className="flex flex-wrap items-center gap-2">
          <Typography variant="body2" color="text.secondary">
            Current status:
          </Typography>
          <BlogStateChip state={saved.publicState} />
          {saved.publishedAt && (
            <Typography variant="caption" color="text.secondary">
              {saved.publicState === 'scheduled' ? 'Goes live' : 'Published'}{' '}
              {formatDateTime(saved.publishedAt)}
            </Typography>
          )}
        </div>
      )}
      <Controller
        name="publishMode"
        control={control}
        render={({ field }) => (
          <RadioGroup
            {...field}
            aria-label="Publish date"
            onChange={(event) => {
              const next = modes.find((value) => value === event.target.value);
              if (next) field.onChange(next);
            }}
          >
            {modes.map((value) => (
              <FormControlLabel
                key={value}
                value={value}
                control={<Radio size="small" />}
                label={
                  value === 'keep' && saved?.publishedAt
                    ? `${MODE_LABELS.keep} (${formatDateTime(saved.publishedAt)})`
                    : MODE_LABELS[value]
                }
                disabled={disabled}
              />
            ))}
          </RadioGroup>
        )}
      />
      {mode === 'schedule' && (
        <FormTextField
          name="publishAt"
          control={control}
          type="datetime-local"
          label="Publish date & time"
          fullWidth
          disabled={disabled}
          helperText={`Your time zone: ${timeZone}. The blog goes live automatically at this time.`}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      )}
      <Typography variant="caption" color="text.secondary">
        Applies when you publish. "Save as draft" keeps the blog hidden whatever is chosen here.
      </Typography>
    </div>
  );
}
