import Typography from '@mui/material/Typography';
import { useFormContext, useWatch } from 'react-hook-form';

import { CharCount } from '@/components/common/CharCount';
import { FormTextField } from '@/components/common/Input';
import { SEO_RECOMMENDED } from '@/utils/constants';
import { slugify } from '@/utils/slug';

import type { ContentPageFormValues } from '../../schemas/contentPageSchema';
import { CONTENT_PAGE_LIMITS } from '../../types/contentPage.types';

const truncate = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

interface ContentPageSeoFieldsProps {
  /** Public site name used in the search result preview, e.g. "Website". */
  siteLabel: string;
  disabled?: boolean;
}

/**
 * Meta title, description and keywords, with the public fallback (meta title → page title) and a
 * preview of how a search result may look.
 */
export function ContentPageSeoFields({ siteLabel, disabled = false }: ContentPageSeoFieldsProps) {
  const { control } = useFormContext<ContentPageFormValues>();
  const [heading, slug, slugEdited, metaTitle, metaDescription, metaKeywords] = useWatch({
    control,
    name: ['heading', 'slug', 'slugEdited', 'metaTitle', 'metaDescription', 'metaKeywords'],
  });
  const shownTitle = metaTitle.trim() || heading.trim() || 'Your page title';
  const shownDescription =
    metaDescription.trim() || 'Add a meta description to control this text in search results.';
  const shownSlug = (slugEdited ? slug : slugify(heading)) || 'your-page';

  return (
    <div className="flex flex-col gap-4">
      <FormTextField<ContentPageFormValues>
        name="metaTitle"
        control={control}
        label="Meta title"
        placeholder="Defaults to the page title"
        fullWidth
        disabled={disabled}
        helperText={
          <CharCount
            hint="Shown as the search result title"
            length={metaTitle.length}
            max={CONTENT_PAGE_LIMITS.metaTitle}
            recommended={SEO_RECOMMENDED.title}
          />
        }
        slotProps={{ htmlInput: { maxLength: CONTENT_PAGE_LIMITS.metaTitle } }}
      />
      <FormTextField<ContentPageFormValues>
        name="metaDescription"
        control={control}
        label="Meta description"
        fullWidth
        multiline
        minRows={2}
        disabled={disabled}
        helperText={
          <CharCount
            hint="Shown under the title in search results"
            length={metaDescription.length}
            max={CONTENT_PAGE_LIMITS.metaDescription}
            recommended={SEO_RECOMMENDED.description}
          />
        }
        slotProps={{ htmlInput: { maxLength: CONTENT_PAGE_LIMITS.metaDescription } }}
      />
      <FormTextField<ContentPageFormValues>
        name="metaKeywords"
        control={control}
        label="Meta keywords"
        placeholder="privacy, data protection"
        fullWidth
        disabled={disabled}
        helperText={
          <CharCount
            hint="Comma-separated"
            length={metaKeywords.length}
            max={CONTENT_PAGE_LIMITS.metaKeywords}
          />
        }
        slotProps={{ htmlInput: { maxLength: CONTENT_PAGE_LIMITS.metaKeywords } }}
      />
      <div aria-label="Search result preview" role="group" className="rounded-lg border p-3">
        <Typography variant="caption" color="text.secondary" className="mb-1 block">
          Search result preview
        </Typography>
        <Typography
          variant="caption"
          className="block truncate text-[var(--mui-palette-success-dark)]"
        >
          {siteLabel} › pages › {shownSlug}
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
