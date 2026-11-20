import Skeleton from '@mui/material/Skeleton';
import type { ReactNode } from 'react';

import { Button } from '@/components/common/Button';
import { ErrorState } from '@/components/common/Feedback/ErrorState';
import { Modal } from '@/components/common/Modal';
import type { EntityId } from '@/types/common.types';

import { useSiteVisit } from '../hooks/useSiteVisits';
import type { SiteVisit } from '../types/siteVisit.types';

interface SiteVisitLoaderProps {
  visitId: EntityId;
  /** Title of the placeholder dialog while loading or on error. */
  title: string;
  onClose: () => void;
  /** Rendered once the full visit is loaded (list rows only carry a summary). */
  children: (visit: SiteVisit) => ReactNode;
}

/** Loads a visit's details, then renders the dialog that needs them. */
export function SiteVisitLoader({ visitId, title, onClose, children }: SiteVisitLoaderProps) {
  const { data: visit, isPending, error, refetch } = useSiteVisit(visitId);

  if (visit) return <>{children(visit)}</>;

  return (
    <Modal
      open
      title={title}
      onClose={onClose}
      actions={
        <Button variant="text" onClick={onClose}>
          Cancel
        </Button>
      }
    >
      {isPending ? (
        <div className="flex flex-col gap-3 pt-2" aria-busy aria-label="Loading site visit">
          <Skeleton variant="rounded" height={44} />
          <Skeleton variant="rounded" height={44} />
          <Skeleton variant="rounded" height={44} />
        </div>
      ) : (
        <ErrorState
          message={
            error?.status === 404
              ? 'This site visit does not exist or has been deleted.'
              : (error?.message ?? 'Could not load the site visit.')
          }
          onRetry={error?.status === 404 ? undefined : () => void refetch()}
        />
      )}
    </Modal>
  );
}
