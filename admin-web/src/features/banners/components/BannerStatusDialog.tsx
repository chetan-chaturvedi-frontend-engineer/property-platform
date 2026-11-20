import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { ConfirmDialog } from '@/components/common/Modal';
import { notify } from '@/store/notificationStore';

import { useChangeBannerStatus } from '../hooks/useBanners';
import { useSequentialRun } from '../hooks/useSequentialRun';
import type { Banner, BannerStatus } from '../types/banner.types';

interface BannerStatusDialogProps {
  banners: readonly Banner[];
  status: BannerStatus;
  onClose: () => void;
  /** Called after the change with the ids that were changed. */
  onDone?: (ids: number[]) => void;
}

const plural = (count: number) => `${count} banner${count === 1 ? '' : 's'}`;

/**
 * Confirms activating or deactivating one or more banners. There is no bulk endpoint, so a bulk
 * change sends one request per banner and reports once. Banners already in the status are skipped.
 */
export function BannerStatusDialog({ banners, status, onClose, onDone }: BannerStatusDialogProps) {
  const targets = banners.filter((banner) => banner.status !== status);
  const isBulk = banners.length > 1;
  const change = useChangeBannerStatus({ quiet: isBulk });
  const sequence = useSequentialRun<Banner>();
  const busy = sequence.isRunning || change.isPending;
  const verb = status === 'active' ? 'Activate' : 'Deactivate';
  const past = status === 'active' ? 'activated' : 'deactivated';
  const [openedAt] = useState(() => Date.now());
  const outsideWindow = targets.filter(
    (banner) =>
      (banner.startDate !== null && Date.parse(banner.startDate) > openedAt) ||
      (banner.endDate !== null && Date.parse(banner.endDate) < openedAt),
  );

  const confirm = async () => {
    if (busy) return;
    const [single] = targets;
    if (!single) {
      onClose();
      return;
    }
    if (!isBulk) {
      change.mutate(
        { id: single.id, status },
        {
          onSuccess: () => {
            onDone?.([single.id]);
            onClose();
          },
        },
      );
      return;
    }
    const { succeeded, failed } = await sequence.run(targets, (banner) =>
      change.mutateAsync({ id: banner.id, status }),
    );
    notify(
      failed === 0
        ? `${plural(succeeded.length)} ${past}.`
        : `${succeeded.length} ${past}, ${failed} failed. Refresh and try again.`,
      failed === 0 ? 'success' : 'warning',
    );
    onDone?.(succeeded.map((banner) => banner.id));
    onClose();
  };

  const subject = isBulk ? plural(targets.length) : `"${banners[0]?.title ?? ''}"`;

  return (
    <ConfirmDialog
      open
      title={`${verb} ${isBulk ? 'banners' : 'banner'}`}
      confirmLabel={verb}
      destructive={status === 'inactive'}
      loading={busy}
      onCancel={onClose}
      onConfirm={() => void confirm()}
      description={
        <div className="flex flex-col gap-3">
          <Typography variant="body2">
            {targets.length === 0
              ? `The selected banners are already ${status}.`
              : status === 'active'
                ? `${verb} ${subject}? It is shown on the app and website while its schedule allows.`
                : `${verb} ${subject}? It stops showing on the app and website within a minute.`}
          </Typography>
          {isBulk && targets.length > 0 && targets.length < banners.length && (
            <Typography variant="caption" color="text.secondary">
              {plural(banners.length - targets.length)} already {status} will be skipped.
            </Typography>
          )}
          {status === 'active' && outsideWindow.length > 0 && (
            <Typography variant="caption" color="text.secondary">
              {isBulk
                ? `${plural(outsideWindow.length)} of these are outside their schedule and stay hidden until the start date, or for good if the end date has passed.`
                : 'This banner is outside its schedule and stays hidden until the start date, or for good if the end date has passed.'}
            </Typography>
          )}
          {sequence.done !== null && (
            <LinearProgress
              variant="determinate"
              value={(sequence.done / Math.max(1, targets.length)) * 100}
              aria-label="Status change progress"
            />
          )}
        </div>
      }
    />
  );
}
