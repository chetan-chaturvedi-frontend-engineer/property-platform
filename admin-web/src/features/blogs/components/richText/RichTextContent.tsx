import { EditorContent, useEditor } from '@tiptap/react';
import { useEffect } from 'react';

import { cn } from '@/utils/helpers';

import { richTextExtensions } from './richTextExtensions';
import './richText.css';

interface RichTextContentProps {
  /** Blog HTML (sanitized by the backend, or the editor's own output for a preview). */
  html: string;
  className?: string;
  /** Accessible name of the article region. */
  label?: string;
}

/**
 * Renders blog HTML read-only through the editor's schema instead of injecting it as raw HTML:
 * only supported nodes and marks are rendered, nothing executes.
 */
export function RichTextContent({ html, className, label = 'Blog content' }: RichTextContentProps) {
  const editor = useEditor({
    extensions: richTextExtensions(),
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
