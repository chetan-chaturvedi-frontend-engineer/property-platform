import ChevronRight from '@mui/icons-material/ChevronRight';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { BADGE_TONE_CLASSES, type BadgeTone } from '@/components/common/Badge';

import { SidebarCard } from './SidebarCard';

export interface QuickAction {
  id: string;
  label: string;
  /** Second line, e.g. a count. */
  description?: string;
  icon: ReactNode;
  tone?: BadgeTone;
  onClick: () => void;
}

interface QuickActionsCardProps {
  actions: readonly QuickAction[];
  title?: string;
}

/** Shortcut buttons with an icon, a label and an optional detail line. */
export function QuickActionsCard({ actions, title = 'Quick actions' }: QuickActionsCardProps) {
  return (
    <SidebarCard title={title}>
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {actions.map((action) => (
          <li key={action.id}>
            <ButtonBase
              onClick={action.onClick}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-[var(--mui-palette-action-hover)]"
              focusRipple
            >
              <span
                aria-hidden
                className={`flex size-8 shrink-0 items-center justify-center rounded-lg [&_svg]:text-[18px] ${BADGE_TONE_CLASSES[action.tone ?? 'primary']}`}
              >
                {action.icon}
              </span>
              <span className="min-w-0 flex-1">
                <Typography variant="body2" fontWeight={600} component="span" className="block">
                  {action.label}
                </Typography>
                {action.description && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    component="span"
                    className="block"
                  >
                    {action.description}
                  </Typography>
                )}
              </span>
              <ChevronRight aria-hidden fontSize="small" className="text-muted" />
            </ButtonBase>
          </li>
        ))}
      </ul>
    </SidebarCard>
  );
}
