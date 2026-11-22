import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { type ReactNode, useId } from 'react';

interface SidebarCardProps {
  title: string;
  /** Optional element at the right of the title, e.g. a "View all" link. */
  action?: ReactNode;
  children: ReactNode;
}

/** Titled panel of the properties sidebar, labelled for assistive technology by its title. */
export function SidebarCard({ title, action, children }: SidebarCardProps) {
  const titleId = useId();
  return (
    <Paper component="section" aria-labelledby={titleId} className="flex flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <Typography id={titleId} variant="subtitle1" component="h2" fontWeight={700}>
          {title}
        </Typography>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </Paper>
  );
}
