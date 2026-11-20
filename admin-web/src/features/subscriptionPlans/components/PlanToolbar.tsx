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

import { Button } from '@/components/common/Button';
import type { SortDirection } from '@/components/common/DataTable/DataTable';

export interface SortOption {
  value: string;
  label: string;
}

interface PlanToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  /** Accessible name of the search box. */
  searchLabel: string;
  searchPlaceholder: string;
  /** `field,direction` of the current sort. */
  sort: string;
  sortOptions: readonly SortOption[];
  onSortChange: (field: string, direction: SortDirection) => void;
  onOpenFilters: () => void;
  panelFilterCount?: number;
  onClear?: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

const SEARCH_MAX_LENGTH = 100;

export function PlanToolbar({
  search,
  onSearchChange,
  searchLabel,
  searchPlaceholder,
  sort,
  sortOptions,
  onSortChange,
  onOpenFilters,
  panelFilterCount = 0,
  onClear,
  onRefresh,
  isRefreshing = false,
}: PlanToolbarProps) {
  return (
    <div className="flex flex-col gap-3 p-4 md:flex-row md:flex-wrap md:items-center">
      <TextField
        size="small"
        type="search"
        placeholder={searchPlaceholder}
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        className="md:min-w-72 md:flex-1 xl:max-w-md"
        slotProps={{
          htmlInput: { maxLength: SEARCH_MAX_LENGTH, 'aria-label': searchLabel },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />
      <TextField
        select
        size="small"
        label="Sort by"
        value={sort}
        onChange={(event) => {
          const [field = '', direction] = event.target.value.split(',');
          onSortChange(field, direction === 'desc' ? 'desc' : 'asc');
        }}
        className="md:w-56"
      >
        {sortOptions.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
      <div className="flex flex-wrap items-center gap-2 md:ml-auto">
        <Button
          variant="outlined"
          startIcon={
            <Badge badgeContent={panelFilterCount} color="primary">
              <FilterList />
            </Badge>
          }
          onClick={onOpenFilters}
        >
          Filters
        </Button>
        {onClear && (
          <Button variant="text" startIcon={<FilterAltOff />} onClick={onClear}>
            Clear all
          </Button>
        )}
        <Tooltip title="Refresh">
          <span>
            <IconButton aria-label="Refresh plans" onClick={onRefresh} disabled={isRefreshing}>
              <Refresh />
            </IconButton>
          </span>
        </Tooltip>
      </div>
    </div>
  );
}
