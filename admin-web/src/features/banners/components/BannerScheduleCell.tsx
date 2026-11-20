import Typography from '@mui/material/Typography';

import { formatDateTime } from '@/utils/formatters';

import type { Banner } from '../types/banner.types';

interface BannerScheduleCellProps {
  banner: Pick<Banner, 'startDate' | 'endDate'>;
}

/** Start "to" end of a banner's schedule, or "--" when it has none. */
export function BannerScheduleCell({ banner }: BannerScheduleCellProps) {
  if (!banner.startDate && !banner.endDate) {
    return (
      <Typography variant="body2" color="text.secondary" aria-label="No schedule">
        --
      </Typography>
    );
  }
  return (
    <div className="text-center text-sm whitespace-nowrap">
      <div>{banner.startDate ? formatDateTime(banner.startDate) : 'Immediately'}</div>
      <Typography variant="caption" color="text.secondary" component="div">
        to
      </Typography>
      <div>{banner.endDate ? formatDateTime(banner.endDate) : 'No end date'}</div>
    </div>
  );
}
