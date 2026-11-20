import CalendarTodayOutlined from '@mui/icons-material/CalendarTodayOutlined';
import ScheduleOutlined from '@mui/icons-material/ScheduleOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { Button } from '@/components/common/Button';
import { ImageThumbnail } from '@/components/common/ImageThumbnail';
import { formatDateTime } from '@/utils/formatters';

import type { Blog } from '../../types/blog.types';
import { PUBLIC_STATE_META } from '../../utils/blogDisplay';
import { BlogStateChip } from '../BlogStateChip';
import { RichTextContent } from '../richText/RichTextContent';

interface BlogDetailsViewProps {
  blog: Blog;
  readingLabel: string;
  onPreview: () => void;
  /** Facts table under the article. */
  info: ReactNode;
}

/** The article as stored: category, title, meta line, image, excerpt and full content. */
export function BlogDetailsView({ blog, readingLabel, onPreview, info }: BlogDetailsViewProps) {
  return (
    <Paper component="section" aria-label="Blog" className="flex min-w-0 flex-col gap-5 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          {blog.category && (
            <Chip
              size="small"
              label={blog.category.title}
              className="self-start font-medium"
              sx={{
                bgcolor: 'rgba(var(--mui-palette-primary-mainChannel) / 0.1)',
                color: 'primary.main',
              }}
            />
          )}
          <Typography component="h2" variant="h4" fontWeight={700} className="break-words">
            {blog.title}
          </Typography>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[var(--mui-palette-text-secondary)]">
            <Typography variant="body2" className="inline-flex items-center gap-1">
              <CalendarTodayOutlined fontSize="inherit" aria-hidden />
              {blog.publishedAt ? formatDateTime(blog.publishedAt) : 'Not published'}
            </Typography>
            <Typography variant="body2" className="inline-flex items-center gap-1">
              <ScheduleOutlined fontSize="inherit" aria-hidden /> {readingLabel}
            </Typography>
            <BlogStateChip state={blog.publicState} />
          </div>
        </div>
        <Button
          variant="outlined"
          startIcon={<VisibilityOutlined />}
          onClick={onPreview}
          className="shrink-0 self-start"
        >
          Preview
        </Button>
      </div>

      {blog.publicState !== 'live' && (
        <Alert severity={blog.publicState === 'category_hidden' ? 'error' : 'info'}>
          {PUBLIC_STATE_META[blog.publicState].description}
          {blog.publicState === 'category_hidden' &&
            ` Activate the "${blog.category?.title ?? ''}" category to show it.`}
        </Alert>
      )}

      <ImageThumbnail
        src={blog.featureImageUrl}
        alt={blog.title}
        aspectClassName="aspect-[40/21]"
        className="w-full"
        eager
      />
      {blog.shortDescription && (
        <Typography variant="body1" color="text.secondary">
          {blog.shortDescription}
        </Typography>
      )}
      <RichTextContent html={blog.content} />
      {info}
    </Paper>
  );
}
