import Code from '@mui/icons-material/Code';
import DataObject from '@mui/icons-material/DataObject';
import FormatBold from '@mui/icons-material/FormatBold';
import FormatClear from '@mui/icons-material/FormatClear';
import FormatItalic from '@mui/icons-material/FormatItalic';
import FormatListBulleted from '@mui/icons-material/FormatListBulleted';
import FormatListNumbered from '@mui/icons-material/FormatListNumbered';
import FormatQuote from '@mui/icons-material/FormatQuote';
import FormatStrikethrough from '@mui/icons-material/FormatStrikethrough';
import FormatUnderlined from '@mui/icons-material/FormatUnderlined';
import ImageOutlined from '@mui/icons-material/ImageOutlined';
import InsertLink from '@mui/icons-material/InsertLink';
import LinkOff from '@mui/icons-material/LinkOff';
import Redo from '@mui/icons-material/Redo';
import Subscript from '@mui/icons-material/Subscript';
import Superscript from '@mui/icons-material/Superscript';
import TableChartOutlined from '@mui/icons-material/TableChartOutlined';
import Undo from '@mui/icons-material/Undo';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import type { Editor } from '@tiptap/core';
import { useEditorState } from '@tiptap/react';
import { type MouseEvent, type ReactNode, useState } from 'react';

import type { RichTextFeatures } from './richTextExtensions';

const BLOCKS = [
  { value: 'paragraph', label: 'Paragraph' },
  { value: 'h1', label: 'Heading 1' },
  { value: 'h2', label: 'Heading 2' },
  { value: 'h3', label: 'Heading 3' },
  { value: 'h4', label: 'Heading 4' },
] as const;
const HEADINGS = [
  { block: 'h1', level: 1 },
  { block: 'h2', level: 2 },
  { block: 'h3', level: 3 },
  { block: 'h4', level: 4 },
] as const;

interface ToolButtonProps {
  label: string;
  /** Keyboard shortcut shown in the tooltip, e.g. "Ctrl+B". */
  shortcut?: string;
  icon: ReactNode;
  onClick: (event: MouseEvent<HTMLElement>) => void;
  active?: boolean;
  disabled?: boolean;
}

function ToolButton({ label, shortcut, icon, onClick, active = false, disabled }: ToolButtonProps) {
  return (
    <Tooltip title={shortcut ? `${label} (${shortcut})` : label}>
      <span>
        <IconButton
          size="small"
          aria-label={label}
          aria-pressed={active}
          onClick={onClick}
          disabled={disabled}
          color={active ? 'primary' : 'default'}
          sx={active ? { bgcolor: 'rgba(var(--mui-palette-primary-mainChannel) / 0.12)' } : {}}
        >
          {icon}
        </IconButton>
      </span>
    </Tooltip>
  );
}

interface RichTextToolbarProps {
  editor: Editor;
  disabled?: boolean;
  /** Which optional controls to show; the editor's schema must have the same features. */
  features: Required<RichTextFeatures>;
  /** Opens the link dialog (the editor keeps the selection). */
  onLink: () => void;
  onImage: () => void;
}

/** Formatting controls limited to what the backend's HTML sanitizer keeps. */
export function RichTextToolbar({
  editor,
  disabled = false,
  features,
  onLink,
  onImage,
}: RichTextToolbarProps) {
  const [tableMenu, setTableMenu] = useState<HTMLElement | null>(null);
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      block: HEADINGS.find(({ level }) => e.isActive('heading', { level }))?.block ?? 'paragraph',
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      code: e.isActive('code'),
      subscript: e.isActive('subscript'),
      superscript: e.isActive('superscript'),
      bulletList: e.isActive('bulletList'),
      orderedList: e.isActive('orderedList'),
      blockquote: e.isActive('blockquote'),
      codeBlock: e.isActive('codeBlock'),
      link: e.isActive('link'),
      table: e.isActive('table'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const chain = () => editor.chain().focus();
  const setBlock = (block: string) => {
    const heading = HEADINGS.find((item) => item.block === block);
    if (heading) chain().setHeading({ level: heading.level }).run();
    else chain().setParagraph().run();
  };
  const tableAction = (run: () => void) => {
    run();
    setTableMenu(null);
  };
  const tableActions: ReadonlyArray<{ label: string; run: () => void }> = state.table
    ? [
        { label: 'Add row below', run: () => chain().addRowAfter().run() },
        { label: 'Add column right', run: () => chain().addColumnAfter().run() },
        { label: 'Delete row', run: () => chain().deleteRow().run() },
        { label: 'Delete column', run: () => chain().deleteColumn().run() },
        { label: 'Delete table', run: () => chain().deleteTable().run() },
      ]
    : [
        {
          label: 'Insert 3 × 3 table',
          run: () => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
        },
      ];

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5"
    >
      {features.headings && (
        <>
          <TextField
            select
            size="small"
            variant="standard"
            value={state.block}
            onChange={(event) => setBlock(event.target.value)}
            disabled={disabled}
            className="mr-1 w-32"
            slotProps={{
              htmlInput: { 'aria-label': 'Text style' },
              input: { disableUnderline: true },
            }}
          >
            {BLOCKS.map((block) => (
              <MenuItem key={block.value} value={block.value}>
                {block.label}
              </MenuItem>
            ))}
          </TextField>
          <Divider orientation="vertical" flexItem className="mx-1" />
        </>
      )}
      <ToolButton
        label="Bold"
        shortcut="Ctrl+B"
        icon={<FormatBold fontSize="small" />}
        active={state.bold}
        disabled={disabled}
        onClick={() => chain().toggleBold().run()}
      />
      <ToolButton
        label="Italic"
        shortcut="Ctrl+I"
        icon={<FormatItalic fontSize="small" />}
        active={state.italic}
        disabled={disabled}
        onClick={() => chain().toggleItalic().run()}
      />
      <ToolButton
        label="Underline"
        shortcut="Ctrl+U"
        icon={<FormatUnderlined fontSize="small" />}
        active={state.underline}
        disabled={disabled}
        onClick={() => chain().toggleUnderline().run()}
      />
      {features.strike && (
        <ToolButton
          label="Strikethrough"
          shortcut="Ctrl+Shift+S"
          icon={<FormatStrikethrough fontSize="small" />}
          active={state.strike}
          disabled={disabled}
          onClick={() => chain().toggleStrike().run()}
        />
      )}
      <ToolButton
        label="Inline code"
        icon={<Code fontSize="small" />}
        active={state.code}
        disabled={disabled}
        onClick={() => chain().toggleCode().run()}
      />
      <ToolButton
        label="Subscript"
        icon={<Subscript fontSize="small" />}
        active={state.subscript}
        disabled={disabled}
        onClick={() => chain().toggleSubscript().run()}
      />
      <ToolButton
        label="Superscript"
        icon={<Superscript fontSize="small" />}
        active={state.superscript}
        disabled={disabled}
        onClick={() => chain().toggleSuperscript().run()}
      />
      <Divider orientation="vertical" flexItem className="mx-1" />
      <ToolButton
        label="Bulleted list"
        icon={<FormatListBulleted fontSize="small" />}
        active={state.bulletList}
        disabled={disabled}
        onClick={() => chain().toggleBulletList().run()}
      />
      <ToolButton
        label="Numbered list"
        icon={<FormatListNumbered fontSize="small" />}
        active={state.orderedList}
        disabled={disabled}
        onClick={() => chain().toggleOrderedList().run()}
      />
      <ToolButton
        label="Quote"
        icon={<FormatQuote fontSize="small" />}
        active={state.blockquote}
        disabled={disabled}
        onClick={() => chain().toggleBlockquote().run()}
      />
      <ToolButton
        label="Code block"
        icon={<DataObject fontSize="small" />}
        active={state.codeBlock}
        disabled={disabled}
        onClick={() => chain().toggleCodeBlock().run()}
      />
      <Divider orientation="vertical" flexItem className="mx-1" />
      <ToolButton
        label={state.link ? 'Edit link' : 'Insert link'}
        shortcut="Ctrl+K"
        icon={<InsertLink fontSize="small" />}
        active={state.link}
        disabled={disabled}
        onClick={onLink}
      />
      {state.link && (
        <ToolButton
          label="Remove link"
          icon={<LinkOff fontSize="small" />}
          disabled={disabled}
          onClick={() => chain().extendMarkRange('link').unsetLink().run()}
        />
      )}
      {features.images && (
        <ToolButton
          label="Insert image"
          icon={<ImageOutlined fontSize="small" />}
          disabled={disabled}
          onClick={onImage}
        />
      )}
      {features.tables && (
        <ToolButton
          label="Table"
          icon={<TableChartOutlined fontSize="small" />}
          active={state.table}
          disabled={disabled}
          onClick={(event) => setTableMenu(event.currentTarget)}
        />
      )}
      <Menu anchorEl={tableMenu} open={tableMenu !== null} onClose={() => setTableMenu(null)}>
        {tableActions.map((action) => (
          <MenuItem key={action.label} onClick={() => tableAction(action.run)}>
            {action.label}
          </MenuItem>
        ))}
      </Menu>
      <Divider orientation="vertical" flexItem className="mx-1" />
      <ToolButton
        label="Clear formatting"
        icon={<FormatClear fontSize="small" />}
        disabled={disabled}
        onClick={() => chain().unsetAllMarks().clearNodes().run()}
      />
      <ToolButton
        label="Undo"
        shortcut="Ctrl+Z"
        icon={<Undo fontSize="small" />}
        disabled={disabled || !state.canUndo}
        onClick={() => chain().undo().run()}
      />
      <ToolButton
        label="Redo"
        shortcut="Ctrl+Shift+Z"
        icon={<Redo fontSize="small" />}
        disabled={disabled || !state.canRedo}
        onClick={() => chain().redo().run()}
      />
    </div>
  );
}
