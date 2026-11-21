import type { Extensions } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { TableKit } from '@tiptap/extension-table';
import { Placeholder } from '@tiptap/extensions';
import StarterKit from '@tiptap/starter-kit';

/**
 * Optional formatting, switched on per use so the editor offers only what that backend's HTML
 * sanitizer keeps. The defaults match the blog sanitizer (jsoup `Safelist.relaxed()`).
 */
export interface RichTextFeatures {
  /** Headings 1–4. */
  headings?: boolean;
  /** Images by `https` URL. */
  images?: boolean;
  tables?: boolean;
  /** Strikethrough (`<s>`). */
  strike?: boolean;
}

export const DEFAULT_RICH_TEXT_FEATURES: Required<RichTextFeatures> = {
  headings: true,
  images: true,
  tables: true,
  strike: false,
};

export function resolveFeatures(features: RichTextFeatures = {}): Required<RichTextFeatures> {
  return { ...DEFAULT_RICH_TEXT_FEATURES, ...features };
}

/** Link targets the backend keeps (`http`, `https`, `mailto`); anything else is removed on save. */
export function isAllowedLink(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/** Images must be absolute `https` URLs; the backend drops `http`, `data:` and relative sources. */
export function isAllowedImageSrc(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Editor schema. Never horizontal rules or inline styles (alignment, colors), which no sanitizer
 * keeps; the optional parts follow `features`.
 */
export function richTextExtensions({
  placeholder,
  features,
}: { placeholder?: string; features?: RichTextFeatures } = {}): Extensions {
  const enabled = resolveFeatures(features);
  return [
    StarterKit.configure({
      strike: enabled.strike ? {} : false,
      horizontalRule: false,
      heading: enabled.headings ? { levels: [1, 2, 3, 4] } : false,
      link: {
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        protocols: ['http', 'https', 'mailto'],
        isAllowedUri: (url) => isAllowedLink(url),
        HTMLAttributes: { rel: 'nofollow noopener noreferrer', target: null },
      },
    }),
    Subscript,
    Superscript,
    ...(enabled.images ? [Image.configure({ allowBase64: false, inline: false })] : []),
    ...(enabled.tables ? [TableKit.configure({ table: { resizable: false } })] : []),
    ...(placeholder ? [Placeholder.configure({ placeholder })] : []),
  ];
}
