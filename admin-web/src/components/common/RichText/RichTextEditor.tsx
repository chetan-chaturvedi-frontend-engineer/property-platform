import FormHelperText from '@mui/material/FormHelperText';
import Typography from '@mui/material/Typography';
import { EditorContent, useEditor } from '@tiptap/react';
import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from 'react';

import { cn } from '@/utils/helpers';

import { RichTextToolbar } from './RichTextToolbar';
import {
  isAllowedImageSrc,
  isAllowedLink,
  resolveFeatures,
  type RichTextFeatures,
  richTextExtensions,
} from './richTextExtensions';
import { UrlDialog, type UrlDialogValues } from './UrlDialog';
import './richText.css';

/** ARIA wiring of the editable area: named by the label, described by the error when there is one. */
function editorAttributes(
  labelId: string,
  errorId: string | null,
  minHeightClassName: string,
): Record<string, string> {
  return {
    class: `rich-text ${minHeightClassName} px-4 py-3`,
    role: 'textbox',
    'aria-multiline': 'true',
    'aria-labelledby': labelId,
    ...(errorId ? { 'aria-invalid': 'true', 'aria-describedby': errorId } : {}),
  };
}

type OpenDialog = { kind: 'link'; initial: UrlDialogValues } | { kind: 'image' };

interface RichTextEditorProps {
  label: string;
  /** HTML; an empty document is reported as `''`. */
  value: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  /** Right side of the footer, e.g. word count and reading time. */
  footer?: ReactNode;
  /** Optional formatting to offer; match what the backend's sanitizer keeps. */
  features?: RichTextFeatures;
  /** Tailwind min-height class of the editable area. */
  minHeightClassName?: string;
}

/**
 * WYSIWYG editor (TipTap) producing HTML. Content is parsed into the editor's schema, so markup it
 * does not support is dropped on load; the backend sanitizes again before storing.
 */
export function RichTextEditor({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  required = false,
  disabled = false,
  error,
  footer,
  features,
  minHeightClassName = 'min-h-64',
}: RichTextEditorProps) {
  const labelId = useId();
  const errorId = useId();
  const [dialog, setDialog] = useState<OpenDialog | null>(null);
  // Ctrl/Cmd+K is handled inside the editor, which is created once; the ref reaches the latest handler.
  const openLinkRef = useRef<() => void>(() => undefined);
  /** HTML emitted by typing since the value was last in sync. */
  const emitted = useRef(new Set<string>());
  const handleEditorKeyDown = useCallback((_view: unknown, event: KeyboardEvent) => {
    if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k') return false;
    event.preventDefault();
    openLinkRef.current();
    return true;
  }, []);

  const enabled = resolveFeatures(features);
  const editor = useEditor({
    extensions: richTextExtensions({ placeholder, features }),
    content: value,
    editable: !disabled,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: editorAttributes(labelId, error ? errorId : null, minHeightClassName),
      handleKeyDown: handleEditorKeyDown,
    },
    onUpdate: ({ editor: current }) => {
      const html = current.isEmpty ? '' : current.getHTML();
      emitted.current.add(html);
      onChange(html);
    },
    onBlur: () => onBlur?.(),
  });

  // The editor is an external system: push value changes that did not come from typing (a form
  // reset or a server value) into it, and keep its editable flag and ARIA state in step. A value
  // the editor emitted itself can arrive after newer keystrokes (typing outpaced the re-render);
  // it is stale, not external, and must not reset the content.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const current = editor.isEmpty ? '' : editor.getHTML();
    if (value === current) {
      emitted.current.clear();
      return;
    }
    if (emitted.current.has(value)) return;
    emitted.current.clear();
    editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);
  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.setEditable(!disabled);
  }, [editor, disabled]);
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.setOptions({
      editorProps: {
        attributes: editorAttributes(labelId, error ? errorId : null, minHeightClassName),
        handleKeyDown: handleEditorKeyDown,
      },
    });
  }, [editor, error, errorId, labelId, handleEditorKeyDown, minHeightClassName]);

  const openLink = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const attributes: Record<string, unknown> = editor.getAttributes('link');
    const href = attributes.href;
    setDialog({
      kind: 'link',
      initial: {
        url: typeof href === 'string' ? href : '',
        text: editor.state.doc.textBetween(from, to, ' '),
      },
    });
  };

  useEffect(() => {
    openLinkRef.current = openLink;
  });

  const applyLink = ({ url, text }: UrlDialogValues) => {
    setDialog(null);
    if (!editor) return;
    const chain = editor.chain().focus().extendMarkRange('link');
    if (editor.state.selection.empty && !editor.isActive('link')) {
      chain
        .insertContent({
          type: 'text',
          text: text || url,
          marks: [{ type: 'link', attrs: { href: url } }],
        })
        .run();
    } else {
      chain.setLink({ href: url }).run();
    }
  };

  const applyImage = ({ url, text }: UrlDialogValues) => {
    setDialog(null);
    editor
      ?.chain()
      .focus()
      .setImage({ src: url, alt: text || undefined })
      .run();
  };

  return (
    <div className="flex flex-col gap-2">
      <Typography id={labelId} component="span" variant="body2" fontWeight={600}>
        {label}
        {required && (
          <span aria-hidden className="text-[var(--mui-palette-error-main)]">
            {' '}
            *
          </span>
        )}
      </Typography>
      <div
        className={cn(
          'overflow-hidden rounded-lg border transition-colors focus-within:border-[var(--mui-palette-primary-main)]',
          error && 'border-[var(--mui-palette-error-main)]',
          disabled && 'opacity-70',
        )}
      >
        {editor && (
          <RichTextToolbar
            editor={editor}
            disabled={disabled}
            features={enabled}
            onLink={openLink}
            onImage={() => setDialog({ kind: 'image' })}
          />
        )}
        <EditorContent editor={editor} className="max-h-[36rem] overflow-y-auto" />
        {footer && (
          <div className="flex justify-end border-t px-3 py-1.5">
            <Typography variant="caption" color="text.secondary" aria-live="polite">
              {footer}
            </Typography>
          </div>
        )}
      </div>
      {error && (
        <FormHelperText error id={errorId}>
          {error}
        </FormHelperText>
      )}

      {dialog?.kind === 'link' && (
        <UrlDialog
          open
          title="Insert link"
          urlLabel="URL"
          urlHelper="https://…, http://… or mailto:…"
          textLabel={editor?.state.selection.empty ? 'Link text' : undefined}
          initial={dialog.initial}
          confirmLabel="Apply"
          validate={(url) =>
            isAllowedLink(url) ? null : 'Use a full https://, http:// or mailto: address'
          }
          onSubmit={applyLink}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'image' && enabled.images && (
        <UrlDialog
          open
          title="Insert image"
          urlLabel="Image URL"
          urlHelper="A public https:// image address. Other sources are removed when saving."
          textLabel="Alternative text (describes the image)"
          confirmLabel="Insert"
          validate={(url) =>
            isAllowedImageSrc(url) ? null : 'Only https:// image addresses are kept'
          }
          onSubmit={applyImage}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
