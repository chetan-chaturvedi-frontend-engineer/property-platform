/** Lowercase letters and digits separated by single hyphens (`Blog.SLUG_PATTERN`). */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Room the backend keeps for a "-2" style suffix when it generates a slug. */
const SUFFIX_RESERVE = 15;

const trimHyphens = (value: string) => value.replace(/^-+|-+$/g, '');

/**
 * Same conversion as the backend's `Slugs.slugify`, so the preview matches what it generates:
 * accents removed, `&` → "and", apostrophes dropped, anything else non-alphanumeric → one hyphen.
 * Empty when nothing usable remains (the backend then uses `blog`).
 */
export function slugify(text: string, maxLength = 255 - SUFFIX_RESERVE): string {
  const ascii = text.normalize('NFKD').replace(/\p{M}+/gu, '');
  const lower = ascii.toLowerCase().replaceAll('&', ' and ').replace(/['’]/g, '');
  const slug = trimHyphens(lower.replace(/[^a-z0-9]+/g, '-'));
  return slug.length <= maxLength ? slug : trimHyphens(slug.slice(0, maxLength));
}

/** Lenient cleanup while the user types a slug by hand: keeps a trailing hyphen to type on. */
export function cleanSlugInput(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+/, '');
}

/**
 * Same normalization as the backend's `BlogTags`: trimmed, inner spaces collapsed, lowercase.
 * Returns null for a tag the backend would reject.
 */
export function normalizeTag(value: string): string | null {
  const tag = value.trim().replace(/\s+/g, ' ').toLowerCase();
  return tag.length <= 50 && /^[\p{L}\p{N}][\p{L}\p{N} ._&+#-]*$/u.test(tag) ? tag : null;
}
