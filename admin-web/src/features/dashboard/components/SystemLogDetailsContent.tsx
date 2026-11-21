import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { ErrorState } from '@/components/common/Feedback/ErrorState';
import { humanizeCode } from '@/utils/formatters';

import type { SystemLog } from '../types/systemLog.types';
import {
  actorLabel,
  describeUserAgent,
  formatLogId,
  maskSensitive,
  moduleLabel,
  statusCodeOf,
  SYSTEM_LOG_LEVEL_META,
} from '../utils/systemLogDisplay';

import { SystemLogLevelChip } from './SystemLogLevelChip';

interface SystemLogDetailsContentProps {
  log: SystemLog | undefined;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

interface DetailRow {
  label: string;
  value: ReactNode;
}

interface DetailSectionProps {
  title: string;
  rows: readonly DetailRow[];
}

const EMPTY = '—';
const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'full' });
const timeFormatter = new Intl.DateTimeFormat(undefined, { timeStyle: 'medium' });

/** A titled list of label/value pairs; long values wrap instead of widening the dialog. */
function DetailSection({ title, rows }: DetailSectionProps) {
  return (
    <section aria-label={title}>
      <Typography variant="subtitle2" component="h3" color="primary" className="mb-2">
        {title}
      </Typography>
      <Paper variant="outlined" className="px-4 py-1">
        <dl className="m-0 divide-y divide-[var(--mui-palette-divider)]">
          {rows.map((row) => (
            <div key={row.label} className="grid gap-1 py-2 sm:grid-cols-[10rem_1fr] sm:gap-4">
              <Typography component="dt" variant="body2" color="text.secondary">
                {row.label}
              </Typography>
              <Typography component="dd" variant="body2" className="m-0 min-w-0 break-words">
                {row.value ?? EMPTY}
              </Typography>
            </div>
          ))}
        </dl>
      </Paper>
    </section>
  );
}

function Mono({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[0.8rem] break-all">{children}</span>;
}

/** Read-only details of one log, grouped into sections. Sensitive keys are masked. */
export function SystemLogDetailsContent({
  log,
  isLoading = false,
  error = null,
  onRetry,
}: SystemLogDetailsContentProps) {
  if (error && !log) {
    return <ErrorState title="Could not load this log" message={error.message} onRetry={onRetry} />;
  }
  if (!log) {
    return (
      <div className="flex flex-col gap-3" aria-busy={isLoading || undefined}>
        <Skeleton variant="text" width="60%" height={32} />
        <Skeleton variant="rounded" height={140} />
        <Skeleton variant="rounded" height={140} />
      </div>
    );
  }

  const created = new Date(log.createdAt);
  const status = statusCodeOf(log);
  const device = describeUserAgent(log.userAgent);
  const actor = actorLabel(log);
  const data = log.additionalData ? maskSensitive(log.additionalData) : null;
  const hasData = data !== null && typeof data === 'object' && Object.keys(data).length > 0;
  const inRequest = Boolean(log.requestMethod || log.requestUrl || log.ipAddress);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            {formatLogId(log.id)}
          </Typography>
          <SystemLogLevelChip level={log.logLevel} />
          <Chip size="small" label={moduleLabel(log.module)} />
        </div>
        <Typography variant="h6" component="p" className="break-words">
          {log.action}
        </Typography>
        {log.logLevel === 'warning' && (
          <Alert severity="warning" variant="outlined">
            {SYSTEM_LOG_LEVEL_META.warning.description}. Check who acted and from where.
          </Alert>
        )}
      </div>

      <DetailSection
        title="Log information"
        rows={[
          { label: 'Log ID', value: formatLogId(log.id) },
          { label: 'Module', value: `${moduleLabel(log.module)} (${log.module})` },
          { label: 'Log level', value: SYSTEM_LOG_LEVEL_META[log.logLevel].label },
          { label: 'Date', value: dateFormatter.format(created) },
          {
            label: 'Time',
            value: (
              <>
                {timeFormatter.format(created)}{' '}
                <Typography component="span" variant="caption" color="text.secondary">
                  ({log.createdAt} UTC)
                </Typography>
              </>
            ),
          },
          {
            label: 'Related record',
            value: log.referenceType
              ? `${log.referenceType}${log.referenceId !== null ? ` #${log.referenceId}` : ''}`
              : EMPTY,
          },
        ]}
      />

      <DetailSection
        title="User"
        rows={
          log.user
            ? [
                { label: 'Name', value: log.user.fullName },
                { label: 'Email', value: log.user.email ?? EMPTY },
                { label: 'User ID', value: log.user.id },
                { label: 'Role', value: humanizeCode(log.user.userType) },
                {
                  label: 'Account status',
                  value: log.user.deleted
                    ? `${humanizeCode(log.user.status)} (deleted)`
                    : humanizeCode(log.user.status),
                },
              ]
            : [{ label: 'Performed by', value: `${actor.name}: ${actor.caption}` }]
        }
      />

      {inRequest ? (
        <DetailSection
          title="Request"
          rows={[
            { label: 'IP address', value: log.ipAddress ? <Mono>{log.ipAddress}</Mono> : EMPTY },
            { label: 'Method', value: log.requestMethod ?? EMPTY },
            { label: 'Endpoint', value: log.requestUrl ? <Mono>{log.requestUrl}</Mono> : EMPTY },
            { label: 'HTTP status', value: status ?? EMPTY },
            { label: 'Browser / device', value: device ?? EMPTY },
            { label: 'User agent', value: log.userAgent ? <Mono>{log.userAgent}</Mono> : EMPTY },
          ]}
        />
      ) : (
        <Typography variant="body2" color="text.secondary">
          Recorded outside a web request (for example by a scheduled job), so there is no IP
          address, endpoint or browser.
        </Typography>
      )}

      <section aria-label="Additional data">
        <Typography variant="subtitle2" component="h3" color="primary" className="mb-2">
          Additional data
        </Typography>
        {hasData ? (
          <Paper
            variant="outlined"
            component="pre"
            tabIndex={0}
            aria-label="Additional data as JSON"
            className="m-0 max-h-72 overflow-auto p-4 font-mono text-[0.8rem] break-words whitespace-pre-wrap"
            sx={{ bgcolor: 'action.hover' }}
          >
            {JSON.stringify(data, null, 2)}
          </Paper>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No additional data was recorded.
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary" component="p" className="mt-2">
          Previous and new values are not recorded by the backend, so there is no before and after
          comparison. Credential-like keys are masked.
        </Typography>
      </section>
    </div>
  );
}
