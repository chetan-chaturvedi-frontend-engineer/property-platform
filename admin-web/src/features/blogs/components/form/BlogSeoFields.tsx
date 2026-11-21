import Typography from '@mui/material/Typography';
import { useFormContext, useWatch } from 'react-hook-form';

import { CharCount } from '@/components/common/CharCount';
import { FormTextField } from '@/components/common/Input';
import { SEO_RECOMMENDED } from '@/utils/constants';
import { slugify } from '@/utils/slug';

import type { BlogFormValues } from '../../schemas/blogSchema';
import { BLOG_LIMITS } from '../../utils/blogDisplay';

const truncate = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

interface BlogSeoFieldsProps {
  /** Public site address used in the search result preview, e.g. "propertypro.com". */
  siteLabel: string;
  disabled?: boolean;
}

/**
 * Meta title and description with the backend's fallbacks (title, short description) and a
 * preview of how a search result may look.
 */
export function BlogSeoFields({ siteLabel, disabled = false }: BlogSeoFieldsProps) {
  const { control } = useFormContext<BlogFormValues>();
  const [title, slug, slugEdited, shortDescription, metaTitle, metaDescription] = useWatch({
    control,
    name: ['title', 'slug', 'slugEdited', 'shortDescription', 'metaTitle', 'metaDescription'],
  });
  const shownTitle = metaTitle.trim() || title.trim() || 'Your blog title';
  const shownDescription =
    metaDescription.trim() ||
    shortDescription.trim() ||
    'Add a short description or meta description to control this text.';
  const shownSlug = (slugEdited ? slug : slugify(title)) || 'your-blog';

  return (
    <div className="flex flex-col gap-4">
      <FormTextField
        name="metaTitle"
        control={control}
        label="Meta title (SEO)"
        placeholder="Defaults to the blog title"
        fullWidth
        disabled={disabled}
        helperText={
          <CharCount
            hint="Shown as the search result title"
            length={metaTitle.length}
            max={BLOG_LIMITS.metaTitle}
            recommended={SEO_RECOMMENDED.title}
          />
        }
        slotProps={{ htmlInput: { maxLength: BLOG_LIMITS.metaTitle } }}
      />
      <FormTextField
        name="metaDescription"
        control={control}
        label="Meta description (SEO)"
        placeholder="Defaults to the short description"
        fullWidth
        multiline
        minRows={2}
        disabled={disabled}
        helperText={
          <CharCount
            hint="Shown under the title in search results"
            length={metaDescription.length}
            max={BLOG_LIMITS.metaDescription}
            recommended={SEO_RECOMMENDED.description}
          />
        }
        slotProps={{ htmlInput: { maxLength: BLOG_LIMITS.metaDescription } }}
      />
      <div aria-label="Search result preview" role="group" className="rounded-lg border p-3">
        <Typography variant="caption" color="text.secondary" className="mb-1 block">
          Search result preview
        </Typography>
        <Typography
          variant="caption"
          className="block truncate text-[var(--mui-palette-success-dark)]"
        >
          {siteLabel} › blog › {shownSlug}
        </Typography>
        <Typography
          variant="subtitle1"
          className="truncate text-[var(--mui-palette-info-main)]"
          fontWeight={500}
        >
          {truncate(shownTitle, SEO_RECOMMENDED.title)}
        </Typography>
        <Typography variant="body2" color="text.secondary" className="line-clamp-2">
          {truncate(shownDescription, SEO_RECOMMENDED.description)}
        </Typography>
      </div>
    </div>
  );
}
