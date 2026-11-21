import { EditorContent, useEditor } from '@tiptap/react';
import { useEffect } from 'react';

import { cn } from '@/utils/helpers';

import { type RichTextFeatures, richTextExtensions } from './richTextExtensions';
import './richText.css';

interface RichTextContentProps {
  /** HTML sanitized by the backend, or the editor's own output for a preview. */
  html: string;
  className?: string;
  /** Accessible name of the article region. */
  label?: string;
  /** The same features as the editor that wrote it, so all of its formatting renders. */
  features?: RichTextFeatures;
}

/**
 * Renders rich text HTML read-only through the editor's schema instead of injecting it as raw HTML:
 * only supported nodes and marks are rendered, nothing executes.
 */
export function RichTextContent({
  html,
  className,
  label = 'Content',
  features,
}: RichTextContentProps) {
  const editor = useEditor({
    extensions: richTextExtensions({ features }),
    content: html,
    editable: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: { class: cn('rich-text', className), role: 'article', 'aria-label': label },
    },
  });

  useEffect(() => {
    if (editor && !editor.isDestroyed && editor.getHTML() !== html) {
      editor.commands.setContent(html, { emitUpdate: false });
    }
  }, [editor, html]);

  return <EditorContent editor={editor} />;
}
