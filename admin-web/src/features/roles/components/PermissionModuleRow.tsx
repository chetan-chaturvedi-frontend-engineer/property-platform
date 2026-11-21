import ChevronRight from '@mui/icons-material/ChevronRight';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import type { PermissionModule } from '../types/role.types';
import {
  actionLabel,
  extraActions,
  moduleCodes,
  moduleState,
  type PermissionSelection,
} from '../utils/permissionMatrix';

import { ModuleIcon } from './ModuleIcon';

interface PermissionModuleRowProps {
  module: PermissionModule;
  /** Action keys shown as columns, in order. */
  columns: readonly string[];
  selection: PermissionSelection;
  expanded: boolean;
  onToggleExpanded: () => void;
  /** Grants or revokes the given codes. */
  onSetCodes: (codes: readonly string[], granted: boolean) => void;
  /** Whether the signed-in admin may change this code (they hold it and the matrix is editable). */
  isChangeable: (code: string) => boolean;
  /** Codes that matched the search, highlighted in the expanded list. */
  highlighted?: readonly string[];
}

const NOT_HELD = 'You can only grant permissions you hold yourself';

/** One module of the permission matrix: column checkboxes, a module checkbox and the full action list. */
export function PermissionModuleRow({
  module,
  columns,
  selection,
  expanded,
  onToggleExpanded,
  onSetCodes,
  isChangeable,
  highlighted = [],
}: PermissionModuleRowProps) {
  const state = moduleState(module, selection);
  const extras = extraActions(module, columns);
  const changeableCodes = moduleCodes(module).filter(isChangeable);
  const detailsId = `permissions-${module.key}`;
  const grantedCount = module.actions.filter((action) => selection.has(action.code)).length;

  return (
    <>
      <TableRow hover sx={{ '& > td': { borderBottom: expanded ? 'none' : undefined } }}>
        <TableCell padding="checkbox">
          <Tooltip title={expanded ? 'Hide permissions' : 'Show all permissions'}>
            <IconButton
              size="small"
              aria-label={`${expanded ? 'Hide' : 'Show'} all ${module.label} permissions`}
              aria-expanded={expanded}
              aria-controls={detailsId}
              onClick={onToggleExpanded}
            >
              <ChevronRight
                fontSize="small"
                sx={{
                  transition: 'transform 150ms',
                  transform: expanded ? 'rotate(90deg)' : 'none',
                }}
              />
            </IconButton>
          </Tooltip>
        </TableCell>
        <TableCell component="th" scope="row">
          <div className="flex min-w-0 items-center gap-2">
            <ModuleIcon moduleKey={module.key} />
            <Typography variant="body2" fontWeight={600} noWrap>
              {module.label}
            </Typography>
            {extras.length > 0 && (
              <Chip
                size="small"
                variant="outlined"
                label={`+${extras.length} more`}
                onClick={onToggleExpanded}
                aria-label={`${extras.length} more ${module.label} permissions`}
              />
            )}
          </div>
        </TableCell>
        {columns.map((column) => {
          const action = module.actions.find((candidate) => candidate.key === column);
          if (!action) {
            return (
              <TableCell key={column} align="center" sx={{ color: 'text.disabled' }}>
                <span aria-label="Not available">—</span>
              </TableCell>
            );
          }
          const changeable = isChangeable(action.code);
          return (
            <TableCell key={column} align="center" padding="checkbox">
              <Checkbox
                size="small"
                checked={selection.has(action.code)}
                disabled={!changeable}
                onChange={(event) => onSetCodes([action.code], event.target.checked)}
                slotProps={{
                  input: { 'aria-label': `${actionLabel(action.key)} — ${module.label}` },
                }}
              />
            </TableCell>
          );
        })}
        <TableCell align="center" padding="checkbox">
          <Checkbox
            size="small"
            checked={state === 'all'}
            indeterminate={state === 'some'}
            disabled={changeableCodes.length === 0}
            // Partly granted: the first click grants the rest.
            onChange={() => onSetCodes(moduleCodes(module), state !== 'all')}
            slotProps={{
              input: {
                'aria-label': `All ${module.label} permissions (${grantedCount} of ${module.actions.length})`,
              },
            }}
          />
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={columns.length + 3} sx={{ py: 0 }}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <div
              id={detailsId}
              role="group"
              aria-label={`${module.label} permissions`}
              className="grid grid-cols-1 gap-x-4 gap-y-1 py-3 pl-2 sm:grid-cols-2 xl:grid-cols-3"
            >
              {module.actions.map((action) => {
                const changeable = isChangeable(action.code);
                const isMatch = highlighted.includes(action.code);
                return (
                  <Tooltip
                    key={action.code}
                    title={!changeable && !selection.has(action.code) ? NOT_HELD : ''}
                    placement="top-start"
                  >
                    <FormControlLabel
                      disabled={!changeable}
                      sx={
                        isMatch
                          ? {
                              bgcolor: 'rgba(var(--mui-palette-primary-mainChannel) / 0.08)',
                              borderRadius: 1,
                            }
                          : undefined
                      }
                      control={
                        <Checkbox
                          size="small"
                          checked={selection.has(action.code)}
                          onChange={(event) => onSetCodes([action.code], event.target.checked)}
                        />
                      }
                      label={
                        <span className="flex flex-col leading-tight">
                          <Typography variant="body2" component="span">
                            {actionLabel(action.key)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" component="span">
                            {action.code}
                          </Typography>
                        </span>
                      }
                    />
                  </Tooltip>
                );
              })}
            </div>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}
