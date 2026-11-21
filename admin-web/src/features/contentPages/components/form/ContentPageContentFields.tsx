import { Controller, useFormContext, useWatch } from 'react-hook-form';

import { CharCount } from '@/components/common/CharCount';
import { FormTextField } from '@/components/common/Input';
import { RichTextEditor } from '@/components/common/RichText';

import type { ContentPageFormValues } from '../../schemas/contentPageSchema';
import { CONTENT_PAGE_LIMITS } from '../../types/contentPage.types';

import { ContentPageSlugField } from './ContentPageSlugField';

interface ContentPageContentFieldsProps {
  /** Props of the slug field (conflict hint, published slug warning). */
  slug: {
    conflictHeading?: string | null;
    publishedSlug?: string;
    canFollowTitle: boolean;
  };
  disabled?: boolean;
}

/** Title, sub heading, slug and rich text content of the page form. */
export function ContentPageContentFields({
  slug,
  disabled = false,
}: ContentPageContentFieldsProps) {
  const { control } = useFormContext<ContentPageFormValues>();
  const [heading, subHeading, content] = useWatch({
    control,
    name: ['heading', 'subHeading', 'content'],
  });

  return (
    <div className="flex flex-col gap-5">
      <FormTextField<ContentPageFormValues>
        name="heading"
        control={control}
        label="Page title"
        placeholder="e.g. Privacy policy"
        required
        fullWidth
        disabled={disabled}
        helperText={
          <CharCount
            hint="Plain text, shown exactly as typed"
            length={heading.trim().length}
            max={CONTENT_PAGE_LIMITS.heading}
          />
        }
        slotProps={{ htmlInput: { maxLength: CONTENT_PAGE_LIMITS.heading } }}
      />
      <FormTextField<ContentPageFormValues>
        name="subHeading"
        control={control}
        label="Sub heading"
        placeholder="Optional, e.g. How we handle your data"
        fullWidth
        disabled={disabled}
        helperText={
          <CharCount
            hint="Shown under the title"
            length={subHeading.trim().length}
            max={CONTENT_PAGE_LIMITS.subHeading}
          />
        }
        slotProps={{ htmlInput: { maxLength: CONTENT_PAGE_LIMITS.subHeading } }}
      />
      <ContentPageSlugField {...slug} disabled={disabled} />
      <Controller
        name="content"
        control={control}
        render={({ field, fieldState: { error } }) => (
          <RichTextEditor
            label="Page content"
            required
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            placeholder="Write the page content…"
            disabled={disabled}
            error={error?.message}
            minHeightClassName="min-h-80"
            footer={`${content.length.toLocaleString()} / ${CONTENT_PAGE_LIMITS.content.toLocaleString()} characters of HTML · images must be https links`}
          />
        )}
      />
    </div>
  );
}
