import CalendarTodayOutlined from '@mui/icons-material/CalendarTodayOutlined';
import OpenInFullOutlined from '@mui/icons-material/OpenInFullOutlined';
import ScheduleOutlined from '@mui/icons-material/ScheduleOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';

import { Button } from '@/components/common/Button';
import { FormSection } from '@/components/common/FormSection';
import { ImageThumbnail } from '@/components/common/ImageThumbnail';

import type { BlogArticleData } from './BlogArticle';

interface BlogPreviewCardProps {
  data: BlogArticleData;
  /** Opens the full-article preview. */
  onOpenFull: () => void;
}

/** Live listing card, as the blog appears in the website's blog list, updated while typing. */
export function BlogPreviewCard({ data, onOpenFull }: BlogPreviewCardProps) {
  return (
    <FormSection
      title="Preview"
      icon={<VisibilityOutlined fontSize="small" />}
      description="This is how your blog will look on the website."
    >
      <div className="overflow-hidden rounded-xl border">
        <ImageThumbnail
          src={data.imageSrc}
          alt={data.title || 'Feature image'}
          aspectClassName="aspect-[40/21]"
          className="w-full rounded-none border-0"
        />
        <div className="flex flex-col gap-2 p-4">
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
            variant="h6"
            component="p"
            fontWeight={700}
            className="line-clamp-2 break-words"
          >
            {data.title || 'Your blog title'}
          </Typography>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[var(--mui-palette-text-secondary)]">
            <Typography variant="caption" className="inline-flex items-center gap-1">
              <CalendarTodayOutlined fontSize="inherit" aria-hidden /> {data.dateLabel}
            </Typography>
            <Typography variant="caption" className="inline-flex items-center gap-1">
              <ScheduleOutlined fontSize="inherit" aria-hidden /> {data.readingLabel}
            </Typography>
          </div>
          <Typography variant="body2" color="text.secondary" className="line-clamp-3">
            {data.shortDescription || 'Your short description appears here.'}
          </Typography>
        </div>
      </div>
      <Button variant="outlined" startIcon={<OpenInFullOutlined />} onClick={onOpenFull}>
        Preview full article
      </Button>
    </FormSection>
  );
}
