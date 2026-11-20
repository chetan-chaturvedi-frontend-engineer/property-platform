import Check from '@mui/icons-material/Check';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { FormSection } from './FormSection';

export interface ChecklistItem {
  key: string;
  text: ReactNode;
  /** Optional small print, e.g. where a limit comes from. */
  note?: ReactNode;
}

interface ChecklistCardProps {
  title: string;
  icon: ReactNode;
  items: readonly ChecklistItem[];
  /** `check`: plain ticks (rules). `circle`: ticked circles in the primary color (tips). */
  marker?: 'check' | 'circle';
  footer?: ReactNode;
}

/** A titled list of short points with tick markers (guidelines, tips). */
export function ChecklistCard({
  title,
  icon,
  items,
  marker = 'check',
  footer,
}: ChecklistCardProps) {
  return (
    <FormSection title={title} icon={icon}>
      <ul className="flex flex-col gap-2.5">
        {items.map((item) => (
          <li key={item.key} className="flex items-start gap-2.5">
            {marker === 'check' ? (
              <Check fontSize="small" color="success" aria-hidden className="mt-px" />
            ) : (
              <CheckCircleOutline fontSize="small" color="primary" aria-hidden className="mt-px" />
            )}
            <div>
              <Typography variant="body2">{item.text}</Typography>
              {item.note && (
                <Typography variant="caption" color="text.secondary" component="p">
                  {item.note}
                </Typography>
              )}
            </div>
          </li>
        ))}
      </ul>
      {footer}
    </FormSection>
  );
}
