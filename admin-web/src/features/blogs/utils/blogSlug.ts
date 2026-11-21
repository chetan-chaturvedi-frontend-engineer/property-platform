/**
 * Same normalization as the backend's `BlogTags`: trimmed, inner spaces collapsed, lowercase.
 * Returns null for a tag the backend would reject.
 */
export function normalizeTag(value: string): string | null {
  const tag = value.trim().replace(/\s+/g, ' ').toLowerCase();
  return tag.length <= 50 && /^[\p{L}\p{N}][\p{L}\p{N} ._&+#-]*$/u.test(tag) ? tag : null;
}
