import EditOutlined from '@mui/icons-material/EditOutlined';
import RestartAlt from '@mui/icons-material/RestartAlt';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import { Controller, useFormContext, useWatch } from 'react-hook-form';

import { cleanSlugInput, slugify } from '@/utils/slug';

import type { ContentPageFormValues } from '../../schemas/contentPageSchema';
import { CONTENT_PAGE_LIMITS } from '../../types/contentPage.types';

const PREFIX = '/pages/';

interface ContentPageSlugFieldProps {
  /** Heading of another page already using the slug shown, if any. */
  conflictHeading?: string | null;
  /** The saved slug of a published page; changing it breaks existing links. */
  publishedSlug?: string;
  /** Whether "generate from the title" can be turned back on (new pages only). */
  canFollowTitle: boolean;
  disabled?: boolean;
}

/**
 * The URL slug. New pages follow the title (and the backend makes it unique) until the user edits
 * it; then it is sent exactly and must be free. A saved page's slug never follows the title.
 */
export function ContentPageSlugField({
  conflictHeading,
  publishedSlug,
  canFollowTitle,
  disabled = false,
}: ContentPageSlugFieldProps) {
  const { control, setValue } = useFormContext<ContentPageFormValues>();
  const [heading, slugEdited, slug] = useWatch({
    control,
    name: ['heading', 'slugEdited', 'slug'],
  });
  const autoSlug = slugify(heading) || 'page';

  const startEditing = () => {
    setValue('slug', slugify(heading), { shouldDirty: true });
    setValue('slugEdited', true, { shouldDirty: true });
  };
  const followTitle = () => {
    setValue('slugEdited', false, { shouldDirty: true });
    setValue('slug', '', { shouldDirty: true, shouldValidate: true });
  };

  if (!slugEdited) {
    return (
      <TextField
        label="URL slug"
        value={heading.trim() ? autoSlug : ''}
        placeholder="generated-from-the-title"
        fullWidth
        disabled={disabled}
        helperText={
          conflictHeading
            ? `Already used by "${conflictHeading}"; a number will be added (e.g. ${autoSlug}-2).`
            : 'Generated from the title. Lowercase letters, digits and hyphens.'
        }
        slotProps={{
          htmlInput: { readOnly: true, 'aria-readonly': true },
          input: {
            startAdornment: <InputAdornment position="start">{PREFIX}</InputAdornment>,
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title="Edit slug">
                  <IconButton
                    aria-label="Edit slug"
                    onClick={startEditing}
                    edge="end"
                    disabled={disabled}
                  >
                    <EditOutlined fontSize="small" />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          },
        }}
      />
    );
  }

  const changedPublished = publishedSlug !== undefined && slug !== publishedSlug;
  return (
    <div className="flex flex-col gap-2">
      <Controller
        name="slug"
        control={control}
        render={({ field: { ref, onChange, ...field }, fieldState: { error } }) => (
          <TextField
            {...field}
            inputRef={ref}
            onChange={(event) => onChange(cleanSlugInput(event.target.value))}
            label="URL slug"
            required
            fullWidth
            disabled={disabled}
            error={Boolean(error) || Boolean(conflictHeading)}
            helperText={
              error?.message ??
              (conflictHeading
                ? `Already used by "${conflictHeading}". Choose another slug.`
                : `Lowercase letters and digits separated by hyphens. Public URL: ${PREFIX}${slug || '…'}`)
            }
            slotProps={{
              htmlInput: { maxLength: CONTENT_PAGE_LIMITS.slug, spellCheck: false },
              input: {
                startAdornment: <InputAdornment position="start">{PREFIX}</InputAdornment>,
                endAdornment: canFollowTitle ? (
                  <InputAdornment position="end">
                    <Tooltip title="Generate from title">
                      <IconButton
                        aria-label="Generate slug from title"
                        onClick={followTitle}
                        edge="end"
                        disabled={disabled}
                      >
                        <RestartAlt fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ) : undefined,
              },
            }}
          />
        )}
      />
      {changedPublished && (
        <Alert severity="warning" variant="outlined" className="py-0">
          This page is published. Changing its URL breaks existing links to {PREFIX}
          {publishedSlug} (there are no redirects).
        </Alert>
      )}
    </div>
  );
}
