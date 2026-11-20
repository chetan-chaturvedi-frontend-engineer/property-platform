import FilterAltOff from '@mui/icons-material/FilterAltOff';
import FilterList from '@mui/icons-material/FilterList';
import Refresh from '@mui/icons-material/Refresh';
import Search from '@mui/icons-material/Search';
import Badge from '@mui/material/Badge';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import type { ReactNode } from 'react';

import { Button } from '@/components/common/Button';

export interface ToolbarOption {
  value: string;
  label: string;
}

/** A dropdown of the toolbar; an empty value means "all". */
export interface ToolbarSelect {
  id: string;
  label: string;
  value: string;
  options: readonly ToolbarOption[];
  onChange: (value: string) => void;
  /** Label of the empty choice, e.g. "All statuses". */
  allLabel?: string;
}

interface ListToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  /** Accessible name of the search box. */
  searchLabel: string;
  searchPlaceholder: string;
  selects: readonly ToolbarSelect[];
  onOpenFilters: () => void;
  panelFilterCount?: number;
  onClear?: () => void;
  onRefresh: () => void;
  /** Accessible name of the refresh button, e.g. "Refresh banners". */
  refreshLabel?: string;
  isRefreshing?: boolean;
  /** Extra controls after the dropdowns. */
  children?: ReactNode;
}

const SEARCH_MAX_LENGTH = 100;

/** Filter button, quick dropdowns and search above a list. */
export function ListToolbar({
  search,
  onSearchChange,
  searchLabel,
  searchPlaceholder,
  selects,
  onOpenFilters,
  panelFilterCount = 0,
  onClear,
  onRefresh,
  refreshLabel = 'Refresh',
  isRefreshing = false,
  children,
}: ListToolbarProps) {
  return (
    <div className="flex flex-col gap-3 p-4 lg:flex-row lg:flex-wrap lg:items-center">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outlined"
          startIcon={
            <Badge badgeContent={panelFilterCount} color="primary">
              <FilterList />
            </Badge>
          }
          onClick={onOpenFilters}
          aria-label={panelFilterCount > 0 ? `Filter (${panelFilterCount} applied)` : 'Filter'}
        >
          Filter
        </Button>
        {selects.map((select) => (
          <TextField
            key={select.id}
            select
            size="small"
            label={select.label}
            value={select.value}
            onChange={(event) => select.onChange(event.target.value)}
            className="w-full sm:w-44"
            slotProps={{ select: { displayEmpty: false } }}
          >
            {select.allLabel !== undefined && <MenuItem value="">{select.allLabel}</MenuItem>}
            {select.options.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        ))}
        {children}
      </div>
      <div className="flex flex-1 flex-wrap items-center gap-2 lg:justify-end">
        <TextField
          size="small"
          type="search"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="w-full sm:w-auto sm:min-w-64 sm:flex-1 lg:max-w-xs"
          slotProps={{
            htmlInput: { maxLength: SEARCH_MAX_LENGTH, 'aria-label': searchLabel },
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        {onClear && (
          <Button variant="text" startIcon={<FilterAltOff />} onClick={onClear}>
            Clear all
          </Button>
        )}
        <Tooltip title="Refresh">
          <span>
            <IconButton aria-label={refreshLabel} onClick={onRefresh} disabled={isRefreshing}>
              <Refresh />
            </IconButton>
          </span>
        </Tooltip>
      </div>
    </div>
  );
}
