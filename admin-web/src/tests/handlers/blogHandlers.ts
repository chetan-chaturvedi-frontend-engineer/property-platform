import { http, HttpResponse } from 'msw';

import {
  BLOG_SORT_FIELDS,
  BLOG_STATUSES,
  type Blog,
  type BlogCategory,
  type BlogStatus,
  type BlogSummary,
} from '@/features/blogs/types/blog.types';
import { normalizeTag } from '@/features/blogs/utils/blogSlug';
import type { PageResponse } from '@/types/api.types';
import { SLUG_PATTERN, slugify } from '@/utils/slug';

import { decodeMockImage } from '../mocks/bannerMockData';
import { publicStateAt, type StoredBlog } from '../mocks/blogMockData';
import { mockDb } from '../mocks/mockDb';

import { apiPath, csrfRejection, problem } from './problem';

/** Mirrors `backend/docs/api/blogs.md`, `blog-categories.md` and `BlogService`. */

const BASE = '/admin/blogs';
const CATEGORIES = '/admin/blog-categories';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const PATCH_FIELDS = new Set([
  'title',
  'slug',
  'content',
  'categoryId',
  'shortDescription',
  'status',
  'publishedAt',
  'metaTitle',
  'metaDescription',
  'tags',
]);

type Body = Record<string, unknown>;
type Errors = Record<string, string>;

function authorize(request: Request, required: string, write = false): { error: Response } | null {
  if (write) {
    const rejected = csrfRejection(request, mockDb.csrfToken());
    if (rejected) return { error: rejected };
  }
  const user = mockDb.sessionUser();
  if (!user) return { error: problem(401, 'unauthorized', 'Authentication required.') };
  if (![required, 'ADMIN_PANEL_ACCESS'].every((p) => user.permissions.includes(p))) {
    return { error: problem(403, 'access_denied', 'Access denied.') };
  }
  return null;
}

const notFound = () => problem(404, 'blog_not_found', 'Blog not found.');
const invalid = (errors: Errors) =>
  problem(400, 'validation_failed', 'Validation failed', { errors });
const slugTaken = () => problem(409, 'blog_slug_taken', 'Another blog already uses this slug.');

const categoryOf = (id: number | null) =>
  id === null ? undefined : mockDb.blogCategories().find((category) => category.id === id);

function toSummary(blog: StoredBlog, now = Date.now()): BlogSummary {
  const category = categoryOf(blog.categoryId);
  return {
    id: blog.id,
    title: blog.title,
    slug: blog.slug,
    featureImageUrl: blog.imageFile
      ? `/api/v1/admin/blogs/${blog.id}/feature-image/${blog.imageFile}`
      : null,
    category: category
      ? { id: category.id, title: category.title, slug: category.slug, status: category.status }
      : null,
    shortDescription: blog.shortDescription,
    status: blog.status,
    publicState: publicStateAt(blog, category, now),
    publishedAt: blog.publishedAt,
    tags: blog.tags,
    createdAt: blog.createdAt,
    updatedAt: blog.updatedAt,
  };
}

function toResponse(blog: StoredBlog): Blog {
  return {
    ...toSummary(blog),
    content: blog.content,
    metaTitle: blog.metaTitle,
    metaDescription: blog.metaDescription,
  };
}

/** Same checks as `MediaUploadService`: type by content, size. */
async function readImage(
  value: FormDataEntryValue | null,
): Promise<{ error: Response } | { bytes: Uint8Array; ext: string }> {
  // Under Jest, jsdom's File reaches Node's FormData as the text "[object File]" (see bannerHandlers).
  if (value === '[object File]') return { bytes: decodeMockImage('green'), ext: 'png' };
  if (!value || typeof value === 'string') {
    return { error: invalid({ featureImage: 'is required' }) };
  }
  if (value.size > MAX_IMAGE_BYTES) {
    return { error: problem(413, 'file_too_large', 'The file is larger than 10 MB.') };
  }
  const bytes = new Uint8Array(await value.arrayBuffer());
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  const isWebp = bytes[0] === 0x52 && bytes[8] === 0x57;
  if (!isPng && !isJpeg && !isWebp) {
    return { error: invalid({ featureImage: 'must be a JPEG, PNG or WebP image' }) };
  }
  return { bytes, ext: isPng ? 'png' : isJpeg ? 'jpg' : 'webp' };
}

/** Like `BlogContent.sanitize` for what tests need: scripts removed, something visible required. */
function sanitize(html: string): string | null {
  const clean = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son\w+="[^"]*"/gi, '');
  const visible = clean
    .replace(/<img\b/gi, 'x<img')
    .replace(/<[^>]+>/g, '')
    .trim();
  return visible ? clean : null;
}

function parseInstant(value: unknown): string | null | undefined {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') return undefined;
  const time = Date.parse(value);
  return Number.isNaN(time) ? undefined : new Date(time).toISOString();
}

function normalizeTags(values: readonly unknown[], errors: Errors): string[] {
  if (values.length > 20) errors.tags = 'size must be between 0 and 20';
  const tags: string[] = [];
  values.forEach((value, index) => {
    const tag = typeof value === 'string' ? normalizeTag(value) : null;
    if (tag === null)
      errors[`tags[${index}]`] = 'must be 1-50 letters, digits, spaces or . _ & + # -';
    else if (!tags.includes(tag)) tags.push(tag);
  });
  return tags;
}

const slugInUse = (slug: string, exceptId?: number) =>
  mockDb.allBlogs().some((blog) => blog.slug === slug && blog.id !== exceptId);

function generateSlug(title: string): string {
  const base = slugify(title) || 'blog';
  if (!slugInUse(base)) return base;
  for (let n = 2; ; n++) if (!slugInUse(`${base}-${n}`)) return `${base}-${n}`;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

/** Status, time and category rules on the merged blog (`BlogService#applyPublication`). */
function checkPublication(blog: StoredBlog, errors: Errors) {
  if (blog.status === 'publish' && blog.categoryId === null) {
    errors.categoryId = 'is required to publish';
  }
  if (blog.categoryId !== null && !categoryOf(blog.categoryId)) {
    errors.categoryId = 'must be an existing category';
  }
}

function matches(blog: StoredBlog, params: URLSearchParams): boolean {
  const search = params.get('search')?.trim().toLowerCase();
  if (search && !blog.title.toLowerCase().includes(search) && !blog.slug.includes(search)) {
    return false;
  }
  const status = params.get('status');
  if (status && blog.status !== status) return false;
  const categoryId = params.get('categoryId');
  if (categoryId && blog.categoryId !== Number(categoryId)) return false;
  const tag = params.get('tag');
  if (tag && !blog.tags.includes(normalizeTag(tag) ?? '')) return false;
  const bound = (key: string, value: string | null, from: boolean) => {
    const limit = params.get(key);
    if (!limit) return true;
    if (!value) return false;
    return from ? value >= new Date(limit).toISOString() : value <= new Date(limit).toISOString();
  };
  return (
    bound('publishedFrom', blog.publishedAt, true) &&
    bound('publishedTo', blog.publishedAt, false) &&
    bound('createdFrom', blog.createdAt, true) &&
    bound('createdTo', blog.createdAt, false)
  );
}

function sortBlogs(rows: StoredBlog[], sort: string | null): StoredBlog[] | null {
  const [field = 'createdAt', direction = sort ? 'asc' : 'desc'] = (sort ?? 'createdAt,desc').split(
    ',',
  );
  const known = BLOG_SORT_FIELDS.find((value) => value === field);
  if (!known) return null;
  const factor = direction === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const left = a[known];
    const right = b[known];
    if (left !== right) {
      if (left === null) return factor;
      if (right === null) return -factor;
      return (left < right ? -1 : 1) * factor;
    }
    return b.id - a.id;
  });
}

const idOf = (value: unknown) => Number(value);
const oneOf = <T extends string>(value: unknown, allowed: readonly T[]) =>
  allowed.find((candidate) => candidate === value);

const log = (action: string, id: number) =>
  mockDb.recordLog({ module: 'blogs', action, referenceId: id, referenceType: 'Blog' });

export const blogHandlers = [
  http.get(apiPath(BASE), ({ request }) => {
    const denied = authorize(request, 'BLOG_VIEW');
    if (denied) return denied.error;
    const params = new URL(request.url).searchParams;
    const status = params.get('status');
    if (status && !oneOf(status, BLOG_STATUSES))
      return invalid({ status: 'must be draft or publish' });
    const sorted = sortBlogs(
      mockDb.blogs().filter((blog) => matches(blog, params)),
      params.get('sort'),
    );
    if (!sorted) return invalid({ sort: `must be one of ${BLOG_SORT_FIELDS.join(', ')}` });
    const page = Number(params.get('page') ?? 0);
    const size = Math.min(Number(params.get('size') ?? 20), 100);
    const now = Date.now();
    const body: PageResponse<BlogSummary> = {
      content: sorted.slice(page * size, page * size + size).map((row) => toSummary(row, now)),
      page,
      size,
      totalElements: sorted.length,
      totalPages: Math.ceil(sorted.length / size),
    };
    return HttpResponse.json(body);
  }),

  http.get(apiPath(`${BASE}/:id/feature-image/:file`), ({ request, params }) => {
    const denied = authorize(request, 'BLOG_VIEW');
    if (denied) return denied.error;
    const blog = mockDb.findBlog(idOf(params.id));
    if (!blog?.imageFile || blog.imageFile !== params.file) return notFound();
    const bytes = mockDb.blogImage(blog.imageFile);
    if (!bytes) return notFound();
    const ext = blog.imageFile.split('.').pop();
    const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    return new HttpResponse(bytes.slice().buffer, {
      headers: { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff' },
    });
  }),

  http.get(apiPath(`${BASE}/:id`), ({ request, params }) => {
    const denied = authorize(request, 'BLOG_VIEW');
    if (denied) return denied.error;
    const blog = mockDb.findBlog(idOf(params.id));
    return blog ? HttpResponse.json(toResponse(blog)) : notFound();
  }),

  http.post(apiPath(BASE), async ({ request }) => {
    const denied = authorize(request, 'BLOG_CREATE', true);
    if (denied) return denied.error;
    const form = await request.formData();
    const field = (key: string) => {
      const value = form.get(key);
      return typeof value === 'string' && value !== '' ? value : null;
    };
    const errors: Errors = {};
    const title = text(field('title')) ?? '';
    if (!title) errors.title = 'must not be blank';
    else if (title.length > 255) errors.title = 'size must be between 0 and 255';
    const slug = field('slug');
    if (slug !== null && !SLUG_PATTERN.test(slug)) {
      errors.slug = 'must be lowercase letters and digits separated by single hyphens';
    }
    const content = sanitize(field('content') ?? '');
    if (content === null) errors.content = 'must contain text or an image';
    const status: BlogStatus | undefined = oneOf(field('status') ?? 'draft', BLOG_STATUSES);
    if (!status) errors.status = 'must be draft or publish';
    const publishedAt = parseInstant(field('publishedAt'));
    if (publishedAt === undefined) errors.publishedAt = 'must be an ISO-8601 instant';
    const tags = normalizeTags(form.getAll('tags'), errors);
    const categoryValue = field('categoryId');
    const now = new Date().toISOString();
    const blog: StoredBlog = {
      id: 0,
      title,
      slug: slug ?? '',
      imageFile: null,
      categoryId: categoryValue === null ? null : Number(categoryValue),
      shortDescription: text(field('shortDescription')),
      content: content ?? '',
      status: status ?? 'draft',
      publishedAt: publishedAt ?? (status === 'publish' ? now : null),
      metaTitle: text(field('metaTitle')),
      metaDescription: text(field('metaDescription')),
      tags,
      createdAt: now,
      updatedAt: now,
    };
    checkPublication(blog, errors);
    if (Object.keys(errors).length > 0) return invalid(errors);
    if (slug !== null && slugInUse(slug)) return slugTaken();

    const image = form.get('featureImage');
    if (image !== null) {
      const read = await readImage(image);
      if ('error' in read) return read.error;
      blog.imageFile = `${crypto.randomUUID()}.${read.ext}`;
      mockDb.storeBlogImage(blog.imageFile, read.bytes);
    }
    const saved = { ...blog, id: mockDb.nextBlogId(), slug: slug ?? generateSlug(title) };
    mockDb.saveBlog(saved);
    log('Blog: create', saved.id);
    return HttpResponse.json(toResponse(saved), { status: 201 });
  }),

  http.patch(apiPath(`${BASE}/:id`), async ({ request, params }) => {
    const denied = authorize(request, 'BLOG_UPDATE', true);
    if (denied) return denied.error;
    const current = mockDb.findBlog(idOf(params.id));
    if (!current) return notFound();
    const body = (await request.json()) as Body;
    const unknown = Object.keys(body).find((key) => !PATCH_FIELDS.has(key));
    if (unknown) return invalid({ [unknown]: 'is not a known field' });

    const blog: StoredBlog = { ...current };
    const errors: Errors = {};
    for (const key of ['title', 'slug', 'content', 'status'] as const) {
      if (key in body && body[key] === null) errors[key] = 'must not be null';
    }
    if (typeof body.title === 'string') {
      const title = body.title.trim();
      if (!title) errors.title = 'must not be blank';
      else blog.title = title;
    }
    let newSlug: string | null = null;
    if (typeof body.slug === 'string') {
      if (!SLUG_PATTERN.test(body.slug)) {
        errors.slug = 'must be lowercase letters and digits separated by single hyphens';
      } else if (body.slug !== blog.slug) newSlug = body.slug;
    }
    if (typeof body.content === 'string') {
      const content = sanitize(body.content);
      if (content === null) errors.content = 'must contain text or an image';
      else blog.content = content;
    }
    if ('categoryId' in body) {
      blog.categoryId = typeof body.categoryId === 'number' ? body.categoryId : null;
    }
    for (const key of ['shortDescription', 'metaTitle', 'metaDescription'] as const) {
      if (key in body) blog[key] = text(body[key]);
    }
    if ('tags' in body) {
      blog.tags = Array.isArray(body.tags) ? normalizeTags(body.tags, errors) : [];
    }
    const wasDraft = blog.status === 'draft';
    if ('status' in body && body.status !== null) {
      const status = oneOf(body.status, BLOG_STATUSES);
      if (!status) errors.status = 'must be draft or publish';
      else blog.status = status;
    }
    if ('publishedAt' in body) {
      const publishedAt = parseInstant(body.publishedAt);
      if (publishedAt === undefined) errors.publishedAt = 'must be an ISO-8601 instant';
      else blog.publishedAt = publishedAt;
    } else if (wasDraft && blog.status === 'publish') {
      blog.publishedAt = new Date().toISOString();
    }
    if (blog.status === 'publish' && blog.publishedAt === null) {
      errors.publishedAt = 'is required for a published blog';
    }
    checkPublication(blog, errors);
    if (Object.keys(errors).length > 0) return invalid(errors);
    if (newSlug !== null) {
      if (slugInUse(newSlug, blog.id)) return slugTaken();
      blog.slug = newSlug;
    }
    const saved = { ...blog, updatedAt: new Date().toISOString() };
    mockDb.saveBlog(saved);
    log('Blog: update', saved.id);
    return HttpResponse.json(toResponse(saved));
  }),

  http.put(apiPath(`${BASE}/:id/feature-image`), async ({ request, params }) => {
    const denied = authorize(request, 'BLOG_UPDATE', true);
    if (denied) return denied.error;
    const current = mockDb.findBlog(idOf(params.id));
    if (!current) return notFound();
    const read = await readImage((await request.formData()).get('featureImage'));
    if ('error' in read) return read.error;
    const imageFile = `${crypto.randomUUID()}.${read.ext}`;
    mockDb.storeBlogImage(imageFile, read.bytes);
    const saved = { ...current, imageFile, updatedAt: new Date().toISOString() };
    mockDb.saveBlog(saved);
    log('Blog: replace feature image', saved.id);
    return HttpResponse.json(toResponse(saved));
  }),

  http.delete(apiPath(`${BASE}/:id/feature-image`), ({ request, params }) => {
    const denied = authorize(request, 'BLOG_UPDATE', true);
    if (denied) return denied.error;
    const current = mockDb.findBlog(idOf(params.id));
    if (!current) return notFound();
    const saved = { ...current, imageFile: null, updatedAt: new Date().toISOString() };
    mockDb.saveBlog(saved);
    log('Blog: remove feature image', saved.id);
    return HttpResponse.json(toResponse(saved));
  }),

  http.delete(apiPath(`${BASE}/:id`), ({ request, params }) => {
    const denied = authorize(request, 'BLOG_DELETE', true);
    if (denied) return denied.error;
    const current = mockDb.findBlog(idOf(params.id));
    if (!current) return notFound();
    mockDb.softDeleteBlog(current.id);
    log('Blog: delete', current.id);
    return new HttpResponse(null, { status: 204 });
  }),

  // Blog categories: the list (by title) and create, as used by the blog form.
  http.get(apiPath(CATEGORIES), ({ request }) => {
    const denied = authorize(request, 'BLOG_CATEGORY_VIEW');
    if (denied) return denied.error;
    const rows: BlogCategory[] = [...mockDb.blogCategories()]
      .sort((a, b) => a.title.localeCompare(b.title))
      .map(({ createdAt: _createdAt, ...category }) => ({
        ...category,
        blogCount: mockDb.blogs().filter((blog) => blog.categoryId === category.id).length,
      }));
    const body: PageResponse<BlogCategory> = {
      content: rows,
      page: 0,
      size: 100,
      totalElements: rows.length,
      totalPages: 1,
    };
    return HttpResponse.json(body);
  }),

  http.post(apiPath(CATEGORIES), async ({ request }) => {
    const denied = authorize(request, 'BLOG_CATEGORY_CREATE', true);
    if (denied) return denied.error;
    const form = await request.formData();
    const title = text(form.get('title'));
    if (!title) return invalid({ title: 'must not be blank' });
    const status = form.get('status') === 'inactive' ? 'inactive' : 'active';
    const base = slugify(title) || 'category';
    let slug = base;
    for (let n = 2; mockDb.blogCategories().some((c) => c.slug === slug); n++)
      slug = `${base}-${n}`;
    const created = mockDb.addBlogCategory({
      title,
      slug,
      status,
      createdAt: new Date().toISOString(),
    });
    const { createdAt: _createdAt, ...category } = created;
    return HttpResponse.json({ ...category, blogCount: 0 }, { status: 201 });
  }),
];
