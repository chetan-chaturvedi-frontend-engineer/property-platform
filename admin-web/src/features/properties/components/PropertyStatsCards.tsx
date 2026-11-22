import ApartmentOutlined from '@mui/icons-material/ApartmentOutlined';
import CancelOutlined from '@mui/icons-material/CancelOutlined';
import EditNoteOutlined from '@mui/icons-material/EditNoteOutlined';
import HourglassTopOutlined from '@mui/icons-material/HourglassTopOutlined';
import TaskAltOutlined from '@mui/icons-material/TaskAltOutlined';
import Alert from '@mui/material/Alert';
import type { ReactNode } from 'react';

import { Button } from '@/components/common/Button';
import { StatCard, type StatCardTone } from '@/components/common/StatCard/StatCard';
import { formatNumber } from '@/utils/formatters';

import { usePropertyStats } from '../hooks/useProperties';
import type { PropertyStats } from '../types/property.types';

interface CardDefinition {
  label: string;
  icon: ReactNode;
  tone: StatCardTone;
  value: (stats: PropertyStats) => number;
  caption: string;
}

/**
 * Publication statuses are exclusive, so these cards never count a property twice. Deleted properties are
 * outside every card. Published, suspended and archived counts stay in the status tabs below.
 */
const CARDS: readonly CardDefinition[] = [
  {
    label: 'All properties',
    icon: <ApartmentOutlined />,
    tone: 'primary',
    value: (s) => s.total,
    caption: 'Not deleted, any status',
  },
  {
    label: 'Pending review',
    icon: <HourglassTopOutlined />,
    tone: 'warning',
    value: (s) => s.byPublicationStatus.pending_review,
    caption: 'Awaiting a reviewer',
  },
  {
    label: 'Approved',
    icon: <TaskAltOutlined />,
    tone: 'info',
    value: (s) => s.byPublicationStatus.approved,
    caption: 'Ready to publish',
  },
  {
    label: 'Drafts',
    icon: <EditNoteOutlined />,
    tone: 'neutral',
    value: (s) => s.byPublicationStatus.draft,
    caption: 'Not submitted yet',
  },
  {
    label: 'Rejected',
    icon: <CancelOutlined />,
    tone: 'error',
    value: (s) => s.byPublicationStatus.rejected,
    caption: 'Sent back to the owner',
  },
];

/** Totals from `GET /admin/properties/stats`; independent of the list filters below. */
export function PropertyStatsCards() {
  const { data, isPending, error, refetch } = usePropertyStats();

  if (error && !data) {
    return (
      <Alert
        severity="error"
        action={
          <Button size="small" variant="text" color="inherit" onClick={() => void refetch()}>
            Retry
          </Button>
        }
      >
        Could not load property statistics. {error.message}
      </Alert>
    );
  }

  return (
    <section
      aria-label="Property statistics"
      className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-5"
    >
      {CARDS.map((card) => (
        <StatCard
          key={card.label}
          label={card.label}
          value={formatNumber(data ? card.value(data) : 0)}
          icon={card.icon}
          tone={card.tone}
          caption={card.caption}
          isLoading={isPending}
          size="compact"
        />
      ))}
    </section>
  );
}
