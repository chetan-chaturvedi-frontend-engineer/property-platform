import type { Extensions } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { TableKit } from '@tiptap/extension-table';
import { Placeholder } from '@tiptap/extensions';
import StarterKit from '@tiptap/starter-kit';

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
 * Only formatting the backend's sanitizer keeps (jsoup `Safelist.relaxed()`): no strikethrough
 * (`<s>`), horizontal rules, inline styles (alignment, colors) or embeds, which it would strip.
 */
export function richTextExtensions({ placeholder }: { placeholder?: string } = {}): Extensions {
  return [
    StarterKit.configure({
      strike: false,
      horizontalRule: false,
      heading: { levels: [1, 2, 3, 4] },
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
    Image.configure({ allowBase64: false, inline: false }),
    TableKit.configure({ table: { resizable: false } }),
    ...(placeholder ? [Placeholder.configure({ placeholder })] : []),
  ];
}
