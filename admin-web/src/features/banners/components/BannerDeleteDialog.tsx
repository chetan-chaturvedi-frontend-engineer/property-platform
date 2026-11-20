import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';

import { ImageThumbnail } from '@/components/common/ImageThumbnail';
import { ConfirmDialog } from '@/components/common/Modal';
import { useSequentialRun } from '@/hooks/useSequentialRun';
import { notify } from '@/store/notificationStore';

import { useDeleteBanner } from '../hooks/useBanners';
import type { Banner } from '../types/banner.types';
import { bannerPlacementLabel } from '../utils/bannerOptions';

interface BannerDeleteDialogProps {
  banners: readonly Banner[];
  onClose: () => void;
  /** Called after deleting with the ids that were deleted. */
  onDone?: (ids: number[]) => void;
}

const plural = (count: number) => `${count} banner${count === 1 ? '' : 's'}`;

/**
 * Confirms deleting one or more banners (a soft delete on the backend). There is no bulk endpoint,
 * so a bulk delete sends one request per banner and reports once.
 */
export function BannerDeleteDialog({ banners, onClose, onDone }: BannerDeleteDialogProps) {
  const isBulk = banners.length > 1;
  const remove = useDeleteBanner({ quiet: isBulk });
  const sequence = useSequentialRun<Banner>();
  const busy = sequence.isRunning || remove.isPending;
  const [single] = banners;
  const liveCount = banners.filter((banner) => banner.displayState === 'live').length;
  const scheduledCount = banners.filter((banner) => banner.displayState === 'scheduled').length;

  const confirm = async () => {
    if (busy || !single) return;
    if (!isBulk) {
      remove.mutate(single.id, {
        onSuccess: () => {
          onDone?.([single.id]);
          onClose();
        },
      });
      return;
    }
    const { succeeded, failed } = await sequence.run(banners, (banner) =>
      remove.mutateAsync(banner.id),
    );
    notify(
      failed === 0
        ? `${plural(succeeded.length)} deleted.`
        : `${succeeded.length} deleted, ${failed} failed. Refresh and try again.`,
      failed === 0 ? 'success' : 'warning',
    );
    onDone?.(succeeded.map((banner) => banner.id));
    onClose();
  };

  return (
    <ConfirmDialog
      open
      title={isBulk ? `Delete ${plural(banners.length)}` : 'Delete banner'}
      confirmLabel="Delete"
      destructive
      loading={busy}
      onCancel={onClose}
      onConfirm={() => void confirm()}
      description={
        <div className="flex flex-col gap-3">
          {!isBulk && single && (
            <div className="flex flex-col gap-2">
              <ImageThumbnail src={single.imageUrl} alt={single.title} className="w-full" />
              <Typography variant="body2" fontWeight={600}>
                {single.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                #{single.id} · {bannerPlacementLabel(single.placement)}
              </Typography>
            </div>
          )}
          <Typography variant="body2">
            {isBulk ? `Delete ${plural(banners.length)}?` : 'Delete this banner?'} Deleted banners
            disappear from this list and are never shown again. This cannot be undone here.
          </Typography>
          {(liveCount > 0 || scheduledCount > 0) && (
            <Alert severity="warning">
              {isBulk
                ? `${liveCount} live now, ${scheduledCount} scheduled: they will no longer be shown.`
                : liveCount > 0
                  ? 'This banner is live now and will disappear from the app and website.'
                  : 'This banner is scheduled and will never start.'}{' '}
              Deactivate instead if you may need {isBulk ? 'them' : 'it'} again.
            </Alert>
          )}
          {sequence.done !== null && (
            <LinearProgress
              variant="determinate"
              value={(sequence.done / Math.max(1, banners.length)) * 100}
              aria-label="Delete progress"
            />
          )}
        </div>
      }
    />
  );
}
