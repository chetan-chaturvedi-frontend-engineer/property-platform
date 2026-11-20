import type { EntityId } from '@/types/common.types';

import type { Banner, BannerStatus } from '../types/banner.types';

import { BannerDeleteDialog } from './BannerDeleteDialog';
import { BannerDetailsDrawer } from './BannerDetailsDrawer';
import { BannerStatusDialog } from './BannerStatusDialog';

/** The one dialog (or drawer) open on the banner list. */
export type ActiveBannerDialog =
  | { kind: 'view'; id: EntityId }
  | { kind: 'status'; banners: Banner[]; status: BannerStatus }
  | { kind: 'delete'; banners: Banner[] };

interface BannerDialogsProps {
  dialog: ActiveBannerDialog | null;
  onClose: () => void;
  /** Offered from the details drawer only when allowed. */
  onEdit?: (banner: Banner) => void;
  showActivity?: boolean;
  /** Called after a status change or delete, e.g. to clear the selection. */
  onDone?: () => void;
}

export function BannerDialogs({
  dialog,
  onClose,
  onEdit,
  showActivity,
  onDone,
}: BannerDialogsProps) {
  if (!dialog) return null;
  switch (dialog.kind) {
    case 'view':
      return (
        <BannerDetailsDrawer
          bannerId={dialog.id}
          onClose={onClose}
          onEdit={onEdit}
          showActivity={showActivity}
        />
      );
    case 'status':
      return (
        <BannerStatusDialog
          banners={dialog.banners}
          status={dialog.status}
          onClose={onClose}
          onDone={onDone}
        />
      );
    case 'delete':
      return <BannerDeleteDialog banners={dialog.banners} onClose={onClose} onDone={onDone} />;
  }
}
