import PersonOffOutlined from '@mui/icons-material/PersonOffOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';

import { getInitials } from '@/utils/helpers';

import type { SystemLog } from '../types/systemLog.types';
import { actorLabel } from '../utils/systemLogDisplay';

interface SystemLogActorProps {
  log: Pick<SystemLog, 'user' | 'requestMethod'>;
}

/** Who acted: initials, name and role; system jobs and guests get an icon instead. */
export function SystemLogActor({ log }: SystemLogActorProps) {
  const { name, caption } = actorLabel(log);
  return (
    <div className="flex min-w-40 items-center gap-3">
      <Avatar
        aria-hidden
        className={
          log.user
            ? 'bg-primary-100 text-sm font-semibold text-primary-800 dark:bg-primary-500/15 dark:text-primary-300'
            : 'text-muted bg-[var(--mui-palette-action-hover)]'
        }
        sx={{ width: 36, height: 36 }}
      >
        {log.user && getInitials(name)}
        {!log.user &&
          (log.requestMethod ? (
            <PersonOffOutlined fontSize="small" />
          ) : (
            <SettingsOutlined fontSize="small" />
          ))}
      </Avatar>
      <div className="min-w-0">
        <Typography variant="body2" fontWeight={600} noWrap>
          {name}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap component="p">
          {caption}
        </Typography>
      </div>
    </div>
  );
}
