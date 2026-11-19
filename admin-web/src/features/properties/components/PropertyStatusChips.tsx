import Chip from '@mui/material/Chip';

import type { LegalApprovalStatus, PublicationStatus } from '../types/property.types';
import { LEGAL_STATUS_META, PUBLICATION_STATUS_META } from '../utils/propertyDisplay';

export function PublicationStatusChip({ status }: { status: PublicationStatus }) {
  const meta = PUBLICATION_STATUS_META[status];
  return (
    <Chip
      size="small"
      variant="outlined"
      color={meta.color}
      label={meta.label}
      icon={<span aria-hidden className="ml-2 size-1.5 rounded-full bg-current" />}
      className="font-medium"
    />
  );
}

export function LegalStatusChip({ status }: { status: LegalApprovalStatus }) {
  const meta = LEGAL_STATUS_META[status];
  return <Chip size="small" color={meta.color} variant="filled" label={meta.label} />;
}
