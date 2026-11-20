import BoltOutlined from '@mui/icons-material/BoltOutlined';
import Button from '@mui/material/Button';
import type { ReactNode } from 'react';

import { FormSection } from '@/components/common/FormSection';

export interface BlogAction {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  tone?: 'default' | 'primary' | 'warning' | 'danger';
}

interface BlogActionsCardProps {
  actions: readonly BlogAction[];
}

const COLORS = {
  default: 'inherit',
  primary: 'primary',
  warning: 'warning',
  danger: 'error',
} as const;

/** A grid of the actions the viewer may take on a blog. */
export function BlogActionsCard({ actions }: BlogActionsCardProps) {
  if (actions.length === 0) return null;
  return (
    <FormSection title="Blog actions" icon={<BoltOutlined fontSize="small" />}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
        {actions.map((action) => (
          <Button
            key={action.key}
            variant={action.tone === 'primary' ? 'contained' : 'outlined'}
            color={COLORS[action.tone ?? 'default']}
            startIcon={action.icon}
            onClick={action.onClick}
            className="justify-start normal-case"
            sx={action.tone === 'default' || !action.tone ? { borderColor: 'divider' } : undefined}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </FormSection>
  );
}
