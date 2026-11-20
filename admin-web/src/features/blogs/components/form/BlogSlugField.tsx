import EditOutlined from '@mui/icons-material/EditOutlined';
import RestartAlt from '@mui/icons-material/RestartAlt';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import { Controller, useFormContext, useWatch } from 'react-hook-form';

import type { BlogFormValues } from '../../schemas/blogSchema';
import { BLOG_LIMITS } from '../../utils/blogDisplay';
import { cleanSlugInput, slugify } from '../../utils/blogSlug';

interface BlogSlugFieldProps {
  /** Title of another blog already using the slug shown, if any. */
  conflictTitle?: string | null;
  /** The saved slug of a published blog; changing it breaks existing links. */
  publishedSlug?: string;
  /** Whether "follow the title" can be turned back on (new blogs only). */
  canFollowTitle: boolean;
  disabled?: boolean;
}

/**
 * The URL slug. New blogs follow the title (and the backend makes it unique) until the user edits
 * it; then it is sent exactly and must be free.
 */
export function BlogSlugField({
  conflictTitle,
  publishedSlug,
  canFollowTitle,
  disabled = false,
}: BlogSlugFieldProps) {
  const { control, setValue } = useFormContext<BlogFormValues>();
  const [title, slugEdited, slug] = useWatch({ control, name: ['title', 'slugEdited', 'slug'] });
  const autoSlug = slugify(title) || 'blog';

  const startEditing = () => {
    setValue('slug', slugify(title), { shouldDirty: true });
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
        value={title.trim() ? autoSlug : ''}
        placeholder="generated-from-the-title"
        fullWidth
        disabled={disabled}
        helperText={
          conflictTitle
            ? `Already used by "${conflictTitle}"; a number will be added (e.g. ${autoSlug}-2).`
            : 'Generated from the title. Lowercase letters, digits and hyphens.'
        }
        slotProps={{
          htmlInput: { readOnly: true, 'aria-readonly': true },
          input: {
            startAdornment: <InputAdornment position="start">/blog/</InputAdornment>,
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
            error={Boolean(error) || Boolean(conflictTitle)}
            helperText={
              error?.message ??
              (conflictTitle
                ? `Already used by "${conflictTitle}". Choose another slug.`
                : 'Lowercase letters and digits separated by hyphens, e.g. best-homes-in-pune.')
            }
            slotProps={{
              htmlInput: { maxLength: BLOG_LIMITS.slug, spellCheck: false },
              input: {
                startAdornment: <InputAdornment position="start">/blog/</InputAdornment>,
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
          This blog is published. Changing its URL breaks existing links to /blog/{publishedSlug}
          (there are no redirects).
        </Alert>
      )}
    </div>
  );
}
