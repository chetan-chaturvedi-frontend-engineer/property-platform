import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

export interface InfoRow {
  key: string;
  label: string;
  value: ReactNode;
}

interface BlogInfoTableProps {
  rows: readonly InfoRow[];
  /** Accessible name of the list. */
  label: string;
}

/** Label/value pairs in two columns on wide screens, one on phones. */
export function BlogInfoTable({ rows, label }: BlogInfoTableProps) {
  return (
    <Paper variant="outlined" className="overflow-hidden">
      <dl aria-label={label} className="grid grid-cols-1 md:grid-cols-2">
        {rows.map((row) => (
          <div
            key={row.key}
            className="grid grid-cols-[9rem_minmax(0,1fr)] items-center gap-3 border-b px-4 py-3 md:odd:border-r"
          >
            <Typography component="dt" variant="body2" color="text.secondary">
              {row.label}
            </Typography>
            <Typography
              component="dd"
              variant="body2"
              fontWeight={500}
              className="min-w-0 break-words"
            >
              {row.value}
            </Typography>
          </div>
        ))}
      </dl>
    </Paper>
  );
}

interface TagListProps {
  tags: readonly string[];
  empty?: string;
}

/** Tags as small chips, or a dash when there are none. */
export function TagList({ tags, empty = '—' }: TagListProps) {
  if (tags.length === 0) return <>{empty}</>;
  return (
    <span className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <Chip key={tag} size="small" variant="outlined" label={tag} />
      ))}
    </span>
  );
}
