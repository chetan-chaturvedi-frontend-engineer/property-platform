import { Badge } from '@/components/common/Badge';

import type { LegalApprovalStatus, PublicationStatus } from '../types/property.types';
import { LEGAL_STATUS_META, PUBLICATION_STATUS_META } from '../utils/propertyDisplay';

export function PublicationStatusChip({ status }: { status: PublicationStatus }) {
  const meta = PUBLICATION_STATUS_META[status];
  return (
    <Badge tone={meta.tone} dot>
      {meta.label}
    </Badge>
  );
}

export function LegalStatusChip({ status }: { status: LegalApprovalStatus }) {
  const meta = LEGAL_STATUS_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
