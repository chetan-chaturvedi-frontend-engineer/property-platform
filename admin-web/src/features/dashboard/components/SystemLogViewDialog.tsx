import ManageSearchOutlined from '@mui/icons-material/ManageSearchOutlined';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { Theme } from '@mui/material/styles';

import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';

import { useSystemLog } from '../hooks/useSystemLogs';
import type { SystemLog, SystemLogUser } from '../types/systemLog.types';

import { SystemLogDetailsContent } from './SystemLogDetailsContent';

interface SystemLogViewDialogProps {
  /** The row picked in the list; null closes the dialog. Its full details are loaded by id. */
  log: SystemLog | null;
  onClose: () => void;
  /** Filters the list by the log's user; omitted when the user filter is not available. */
  onShowUserActivity?: (user: SystemLogUser) => void;
}

/** Read-only details of one log in a dialog; full screen on phones. */
export function SystemLogViewDialog({
  log,
  onClose,
  onShowUserActivity,
}: SystemLogViewDialogProps) {
  const fullScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));
  const { data, isPending, error, refetch } = useSystemLog(log?.id ?? null, {
    placeholder: log ?? undefined,
  });
  const user = data?.user;

  return (
    <Modal
      open={log !== null}
      onClose={onClose}
      title="System log details"
      maxWidth="md"
      fullScreen={fullScreen}
      actions={
        <>
          {onShowUserActivity && user && (
            <Button
              variant="outlined"
              startIcon={<ManageSearchOutlined />}
              onClick={() => onShowUserActivity(user)}
            >
              Show this user&apos;s activity
            </Button>
          )}
          <Button onClick={onClose}>Close</Button>
        </>
      }
    >
      <SystemLogDetailsContent
        log={data}
        isLoading={isPending}
        error={error}
        onRetry={() => void refetch()}
      />
    </Modal>
  );
}
