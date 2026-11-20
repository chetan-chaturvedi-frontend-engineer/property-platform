import type { Path } from 'react-hook-form';

import type { Nullable } from '@/types/common.types';

import type { BlogFormValues, PublishMode, SaveIntent } from '../schemas/blogSchema';
import type { Blog, CreateBlogRequest, UpdateBlogRequest } from '../types/blog.types';

/** Form fields the backend's field errors can be mapped to (`applyServerErrors`). */
export const BLOG_FORM_FIELDS: readonly Path<BlogFormValues>[] = [
  'title',
  'slug',
  'categoryId',
  'shortDescription',
  'content',
  'tags',
  'metaTitle',
  'metaDescription',
  'image',
];

/** Backend field names that differ from the form's. */
export const SERVER_FIELD_ALIASES: Record<string, Path<BlogFormValues>> = {
  publishedAt: 'publishAt',
  featureImage: 'image',
  status: 'categoryId',
};

const pad = (value: number) => String(value).padStart(2, '0');

/** ISO instant → `datetime-local` value in the browser's time zone. */
export function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/** `datetime-local` value (browser time zone) → ISO instant in UTC, as the API expects. */
export function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Tomorrow 09:00 local time, the suggested time when scheduling. */
function suggestedScheduleTime(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return toLocalInput(date.toISOString());
}

/** True for a published blog whose time has come (live or hidden by its category). */
export function isPublishedNow(blog: Pick<Blog, 'status' | 'publicState'>): boolean {
  return blog.status === 'publish' && blog.publicState !== 'scheduled';
}

/** Publish timing choices offered for a blog (none saved = a new one). */
export function publishModesFor(saved?: Pick<Blog, 'status' | 'publicState'>): PublishMode[] {
  if (!saved) return ['now', 'schedule'];
  if (isPublishedNow(saved)) return ['keep', 'schedule'];
  return ['now', 'schedule'];
}

export function emptyBlogForm(): BlogFormValues {
  return {
    intent: 'draft',
    title: '',
    slugEdited: false,
    slug: '',
    categoryId: null,
    shortDescription: '',
    content: '',
    tags: [],
    image: null,
    removeImage: false,
    publishMode: 'now',
    publishAt: suggestedScheduleTime(),
    metaTitle: '',
    metaDescription: '',
  };
}

/** Form values of a saved blog; also the start of a duplicate (adjusted by the caller). */
export function toBlogFormValues(blog: Blog): BlogFormValues {
  const scheduled = blog.publicState === 'scheduled';
  return {
    intent: blog.status === 'publish' ? 'publish' : 'draft',
    title: blog.title,
    slugEdited: true,
    slug: blog.slug,
    categoryId: blog.category?.id ?? null,
    shortDescription: blog.shortDescription ?? '',
    content: blog.content,
    tags: blog.tags,
    image: null,
    removeImage: false,
    publishMode: isPublishedNow(blog) ? 'keep' : scheduled ? 'schedule' : 'now',
    publishAt: scheduled ? toLocalInput(blog.publishedAt) : suggestedScheduleTime(),
    metaTitle: blog.metaTitle ?? '',
    metaDescription: blog.metaDescription ?? '',
  };
}

const textOrUndefined = (value: string) => value.trim() || undefined;
const textOrNull = (value: string): Nullable<string> => value.trim() || null;

/** `POST` fields. An untouched slug is left out, so the backend generates a unique one. */
export function toCreateRequest(values: BlogFormValues, intent: SaveIntent): CreateBlogRequest {
  const publishAt =
    intent === 'publish' && values.publishMode === 'schedule'
      ? fromLocalInput(values.publishAt)
      : null;
  return {
    title: values.title.trim(),
    content: values.content,
    ...(values.slugEdited && values.slug ? { slug: values.slug } : {}),
    ...(values.categoryId !== null ? { categoryId: values.categoryId } : {}),
    shortDescription: textOrUndefined(values.shortDescription),
    status: intent,
    ...(publishAt ? { publishedAt: publishAt } : {}),
    metaTitle: textOrUndefined(values.metaTitle),
    metaDescription: textOrUndefined(values.metaDescription),
    ...(values.tags.length > 0 ? { tags: values.tags } : {}),
  };
}

const sameTags = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((tag, index) => tag === b[index]);

/** The form edits minutes; a saved value with seconds is unchanged if it is the same minute. */
function sameMinute(a: Nullable<string>, b: Nullable<string>): boolean {
  if (a === null || b === null) return a === b;
  return Math.floor(Date.parse(a) / 60_000) === Math.floor(Date.parse(b) / 60_000);
}

/**
 * `PATCH` body with only what changed. `intent` decides the status: `draft` unpublishes, `publish`
 * publishes (now, at the scheduled time, or keeping the saved time).
 */
export function toUpdateRequest(
  blog: Blog,
  values: BlogFormValues,
  intent: SaveIntent,
  now = new Date(),
): UpdateBlogRequest {
  const request: UpdateBlogRequest = {};
  const title = values.title.trim();
  if (title !== blog.title) request.title = title;
  if (values.slugEdited && values.slug && values.slug !== blog.slug) request.slug = values.slug;
  if (values.content !== blog.content) request.content = values.content;
  if (values.categoryId !== (blog.category?.id ?? null)) request.categoryId = values.categoryId;
  const shortDescription = textOrNull(values.shortDescription);
  if (shortDescription !== blog.shortDescription) request.shortDescription = shortDescription;
  const metaTitle = textOrNull(values.metaTitle);
  if (metaTitle !== blog.metaTitle) request.metaTitle = metaTitle;
  const metaDescription = textOrNull(values.metaDescription);
  if (metaDescription !== blog.metaDescription) request.metaDescription = metaDescription;
  if (!sameTags(values.tags, blog.tags)) request.tags = values.tags.length > 0 ? values.tags : null;

  if (intent === 'draft') {
    if (blog.status !== 'draft') request.status = 'draft';
    return request;
  }

  if (blog.status !== 'publish') request.status = 'publish';
  if (values.publishMode === 'schedule') {
    const publishAt = fromLocalInput(values.publishAt);
    if (publishAt && (blog.status !== 'publish' || !sameMinute(publishAt, blog.publishedAt))) {
      request.publishedAt = publishAt;
    }
  } else if (values.publishMode === 'now' && blog.status === 'publish') {
    // A scheduled blog published early; a draft needs no time (the server uses its own clock).
    request.publishedAt = now.toISOString();
  }
  return request;
}

/** A route id segment as a positive blog id, or null (the API rejects anything else). */
export function parseBlogId(value: string | null | undefined): number | null {
  if (!value || !/^\d{1,18}$/.test(value)) return null;
  const id = Number(value);
  return id > 0 && Number.isSafeInteger(id) ? id : null;
}
