import EmailOutlined from '@mui/icons-material/EmailOutlined';
import PhoneOutlined from '@mui/icons-material/PhoneOutlined';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { InitialsAvatar } from '@/components/common/InitialsAvatar';

import type { BuilderAccount } from '../types/property.types';

interface BuilderAccountCardProps {
  builder: BuilderAccount;
  /** Optional element at the right, e.g. a "Change" button. */
  action?: ReactNode;
  className?: string;
}

/** A builder account's name, user id and contact details. */
export function BuilderAccountCard({ builder, action, className = '' }: BuilderAccountCardProps) {
  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3 ${className}`}>
      <InitialsAvatar name={builder.fullName} size={40} />
      <div className="min-w-0 flex-1">
        <Typography variant="body2" fontWeight={600} className="break-words">
          {builder.fullName}
        </Typography>
        <Typography variant="caption" color="text.secondary" component="p">
          Builder account · User ID {builder.id}
        </Typography>
        <div className="mt-1 flex flex-col gap-0.5">
          <Typography variant="caption" className="flex min-w-0 items-center gap-1">
            <EmailOutlined aria-hidden sx={{ fontSize: 14 }} className="shrink-0 text-muted" />
            <span className="truncate">{builder.email ?? 'No email'}</span>
          </Typography>
          <Typography variant="caption" className="flex items-center gap-1">
            <PhoneOutlined aria-hidden sx={{ fontSize: 14 }} className="shrink-0 text-muted" />
            {builder.phone ?? 'No phone'}
          </Typography>
        </div>
      </div>
      {action}
    </div>
  );
}
