import CalendarTodayOutlined from '@mui/icons-material/CalendarTodayOutlined';
import ScheduleOutlined from '@mui/icons-material/ScheduleOutlined';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';

import { ImageThumbnail } from '@/components/common/ImageThumbnail';
import { cn } from '@/utils/helpers';

import { RichTextContent } from '../richText/RichTextContent';

/** What a reader sees of a blog; built from saved data or from the form while editing. */
export interface BlogArticleData {
  title: string;
  shortDescription: string;
  categoryTitle: string | null;
  /** Local `data:` preview or the admin image path. */
  imageSrc: string | null;
  /** E.g. "26 May 2026" or "Not published yet". */
  dateLabel: string;
  readingLabel: string;
  tags: readonly string[];
  /** HTML. */
  content: string;
}

interface BlogArticleProps {
  data: BlogArticleData;
  /** `compact` for phone-width frames. */
  density?: 'comfortable' | 'compact';
}

/** The full article as it may appear on the website: image, meta line, title, excerpt, body, tags. */
export function BlogArticle({ data, density = 'comfortable' }: BlogArticleProps) {
  const compact = density === 'compact';
  return (
    <article className="flex flex-col gap-4">
      <ImageThumbnail
        src={data.imageSrc}
        alt={data.title || 'Feature image'}
        aspectClassName="aspect-[40/21]"
        className="w-full"
        eager
      />
      <div className="flex flex-col gap-2">
        {data.categoryTitle && (
          <Chip
            size="small"
            label={data.categoryTitle}
            className="self-start font-medium"
            sx={{
              bgcolor: 'rgba(var(--mui-palette-primary-mainChannel) / 0.1)',
              color: 'primary.main',
            }}
          />
        )}
        <Typography
          component="h2"
          variant={compact ? 'h6' : 'h4'}
          fontWeight={700}
          className="break-words"
        >
          {data.title || 'Your blog title'}
        </Typography>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[var(--mui-palette-text-secondary)]">
          <Typography variant="caption" className="inline-flex items-center gap-1">
            <CalendarTodayOutlined fontSize="inherit" aria-hidden /> {data.dateLabel}
          </Typography>
          <Typography variant="caption" className="inline-flex items-center gap-1">
            <ScheduleOutlined fontSize="inherit" aria-hidden /> {data.readingLabel}
          </Typography>
        </div>
        {data.shortDescription && (
          <Typography variant={compact ? 'body2' : 'body1'} color="text.secondary">
            {data.shortDescription}
          </Typography>
        )}
      </div>
      {data.content ? (
        <RichTextContent html={data.content} className={cn(compact && 'text-sm')} />
      ) : (
        <Typography variant="body2" color="text.secondary">
          The blog content appears here.
        </Typography>
      )}
      {data.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t pt-3" aria-label="Tags">
          {data.tags.map((tag) => (
            <Chip key={tag} size="small" variant="outlined" label={`#${tag}`} />
          ))}
        </div>
      )}
    </article>
  );
}
