import FilterAltOff from '@mui/icons-material/FilterAltOff';
import Search from '@mui/icons-material/Search';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';

import { Button } from '@/components/common/Button';
import { formatNumber } from '@/utils/formatters';

export interface StatusTabOption<TValue extends string> {
  value: TValue;
  label: string;
  /** Shown in brackets after the label once known. */
  count?: number;
}

export interface RoleFilterOption {
  value: string;
  label: string;
}

interface UserFiltersBarProps<TStatus extends string> {
  statusTabs: readonly StatusTabOption<TStatus>[];
  status: TStatus;
  onStatusChange: (status: TStatus) => void;
  roles: readonly RoleFilterOption[];
  /** Role slug; empty for all roles. */
  role: string;
  onRoleChange: (role: string) => void;
  rolesError?: boolean;
  /** `yyyy-MM-dd` or empty. */
  joinedFrom: string;
  joinedTo: string;
  onJoinedFromChange: (value: string) => void;
  onJoinedToChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  searchMaxLength?: number;
  /** Shows the "Clear filters" button. */
  canClear?: boolean;
  onClear: () => void;
}

const COMPACT_FIELD_SX = {
  '& .MuiInputBase-root': { fontSize: 14 },
  '& .MuiInputBase-input': { py: '7px' },
  '& .MuiInputLabel-root:not(.MuiInputLabel-shrink)': { fontSize: 14, top: -2 },
} as const;

/** Status tabs, role and joined-date filters in one compact row, with the search box below. */
export function UserFiltersBar<TStatus extends string>({
  statusTabs,
  status,
  onStatusChange,
  roles,
  role,
  onRoleChange,
  rolesError = false,
  joinedFrom,
  joinedTo,
  onJoinedFromChange,
  onJoinedToChange,
  search,
  onSearchChange,
  searchMaxLength,
  canClear = false,
  onClear,
}: UserFiltersBarProps<TStatus>) {
  const rangeInvalid = joinedFrom !== '' && joinedTo !== '' && joinedTo < joinedFrom;

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-2 border-b px-4 pb-3 xl:flex-row xl:items-center xl:gap-3 xl:pb-0">
        <Tabs
          value={status}
          onChange={(_, value: TStatus) => onStatusChange(value)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          aria-label="Filter users by status"
          textColor="inherit"
          className="min-w-0 xl:flex-1"
          sx={{
            minHeight: 48,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: 14,
              minHeight: 48,
              minWidth: 0,
              px: 1.5,
            },
            '& .Mui-selected': { color: 'var(--app-primary-strong)' },
            '& .MuiTabs-indicator': { backgroundColor: 'var(--app-primary-strong)', height: 3 },
          }}
        >
          {statusTabs.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              label={
                tab.count === undefined ? tab.label : `${tab.label} (${formatNumber(tab.count)})`
              }
            />
          ))}
        </Tabs>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-start xl:flex-nowrap xl:py-2">
          <TextField
            select
            size="small"
            label="Role"
            value={role}
            onChange={(event) => onRoleChange(event.target.value)}
            error={rolesError}
            helperText={rolesError ? 'Could not load roles' : undefined}
            className="sm:w-40"
            sx={COMPACT_FIELD_SX}
          >
            <MenuItem value="">All roles</MenuItem>
            {roles.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            type="date"
            label="Joined from"
            value={joinedFrom}
            onChange={(event) => onJoinedFromChange(event.target.value)}
            className="sm:w-40"
            sx={COMPACT_FIELD_SX}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: joinedTo || undefined } }}
          />
          <TextField
            size="small"
            type="date"
            label="Joined to"
            value={joinedTo}
            onChange={(event) => onJoinedToChange(event.target.value)}
            error={rangeInvalid}
            helperText={rangeInvalid ? 'Must not be before the start date' : undefined}
            className="sm:w-40"
            sx={COMPACT_FIELD_SX}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { min: joinedFrom || undefined },
            }}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
        <TextField
          size="small"
          type="search"
          placeholder="Search by name, email or phone…"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="sm:w-80"
          sx={COMPACT_FIELD_SX}
          slotProps={{
            htmlInput: { maxLength: searchMaxLength, 'aria-label': 'Search users' },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        {canClear && (
          <Button
            variant="text"
            size="small"
            startIcon={<FilterAltOff />}
            onClick={onClear}
            className="self-start sm:self-auto"
          >
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
