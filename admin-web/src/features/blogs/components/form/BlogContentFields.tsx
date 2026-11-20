import { Controller, useFormContext, useWatch } from 'react-hook-form';

import { ImageUpload } from '@/components/common/ImageUpload';
import { FormTextField } from '@/components/common/Input';
import type { ImageDimensions } from '@/utils/image';

import type { BlogFormValues } from '../../schemas/blogSchema';
import type { BlogCategory, BlogCategoryRef } from '../../types/blog.types';
import { BLOG_LIMITS, RECOMMENDED_BLOG_IMAGE } from '../../utils/blogDisplay';
import { RichTextEditor } from '../richText/RichTextEditor';

import { BlogCategoryField } from './BlogCategoryField';
import { BlogSlugField } from './BlogSlugField';
import { BlogTagsField } from './BlogTagsField';
import { CharCount } from './CharCount';

interface BlogContentFieldsProps {
  categories: {
    options: readonly BlogCategory[] | undefined;
    isLoading: boolean;
    unavailableNote?: string;
    saved?: BlogCategoryRef | null;
    onAdd?: () => void;
  };
  slug: {
    conflictTitle: string | null;
    publishedSlug?: string;
    canFollowTitle: boolean;
  };
  image: {
    previewSrc: string | null;
    fileInfo?: { name: string; size: number } | null;
    dimensions?: ImageDimensions | null;
    maxSizeLabel: string;
    progress: number | null;
    onSelect: (file: File) => void;
    onRemove?: () => void;
  };
  tagSuggestions: readonly string[];
  /** Word count and reading time under the editor. */
  contentFooter: string;
  disabled?: boolean;
}

/** Title, slug, category, excerpt, feature image, rich text body and tags. */
export function BlogContentFields({
  categories,
  slug,
  image,
  tagSuggestions,
  contentFooter,
  disabled = false,
}: BlogContentFieldsProps) {
  const { control, formState } = useFormContext<BlogFormValues>();
  const [title, shortDescription] = useWatch({ control, name: ['title', 'shortDescription'] });

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormTextField
          name="title"
          control={control}
          label="Blog title"
          placeholder="Enter blog title"
          required
          fullWidth
          disabled={disabled}
          helperText={<CharCount length={title.length} max={BLOG_LIMITS.title} />}
          slotProps={{ htmlInput: { maxLength: BLOG_LIMITS.title } }}
        />
        <BlogCategoryField
          categories={categories.options}
          isLoading={categories.isLoading}
          unavailableNote={categories.unavailableNote}
          savedCategory={categories.saved}
          onAddCategory={categories.onAdd}
          disabled={disabled}
        />
      </div>
      <BlogSlugField
        conflictTitle={slug.conflictTitle}
        publishedSlug={slug.publishedSlug}
        canFollowTitle={slug.canFollowTitle}
        disabled={disabled}
      />
      <FormTextField
        name="shortDescription"
        control={control}
        label="Short description"
        placeholder="Write a short summary for blog lists and previews"
        fullWidth
        multiline
        minRows={3}
        disabled={disabled}
        helperText={
          <CharCount
            hint="Shown in blog lists; also the search description when no meta description is set."
            length={shortDescription.length}
            max={BLOG_LIMITS.shortDescription}
          />
        }
        slotProps={{ htmlInput: { maxLength: BLOG_LIMITS.shortDescription } }}
      />
      <ImageUpload
        label="Featured image"
        dropTitle="Upload featured image"
        aspectClassName="aspect-[40/21]"
        previewSrc={image.previewSrc}
        fileInfo={image.fileInfo}
        dimensions={image.dimensions}
        recommended={RECOMMENDED_BLOG_IMAGE}
        maxSizeLabel={image.maxSizeLabel}
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        onSelect={image.onSelect}
        onRemove={image.onRemove}
        error={formState.errors.image?.message}
        progress={image.progress}
        disabled={disabled}
      />
      <Controller
        name="content"
        control={control}
        render={({ field, fieldState: { error } }) => (
          <RichTextEditor
            label="Content"
            required
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            placeholder="Write your blog content here…"
            error={error?.message}
            footer={contentFooter}
            disabled={disabled}
          />
        )}
      />
      <BlogTagsField suggestions={tagSuggestions} disabled={disabled} />
    </div>
  );
}
