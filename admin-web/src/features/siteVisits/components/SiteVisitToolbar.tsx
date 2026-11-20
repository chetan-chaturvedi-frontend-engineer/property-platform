import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import FilterAltOff from '@mui/icons-material/FilterAltOff';
import FilterList from '@mui/icons-material/FilterList';
import Refresh from '@mui/icons-material/Refresh';
import Search from '@mui/icons-material/Search';
import ViewListOutlined from '@mui/icons-material/ViewListOutlined';
import Badge from '@mui/material/Badge';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';

import { Button } from '@/components/common/Button';

export type SiteVisitView = 'list' | 'calendar';

interface SiteVisitToolbarProps {
  view: SiteVisitView;
  onViewChange: (view: SiteVisitView) => void;
  search: string;
  onSearchChange: (value: string) => void;
  /** `yyyy-MM-dd` bounds, inclusive; hidden in the calendar view (the month is the range). */
  dateFrom: string;
  dateTo: string;
  onDateChange: (from: string, to: string) => void;
  /** Shows the "Filters" button that opens the panel (when it is not beside the table). */
  onOpenFilters?: () => void;
  panelFilterCount?: number;
  onClear?: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

const SEARCH_MAX_LENGTH = 100;

export function SiteVisitToolbar({
  view,
  onViewChange,
  search,
  onSearchChange,
  dateFrom,
  dateTo,
  onDateChange,
  onOpenFilters,
  panelFilterCount = 0,
  onClear,
  onRefresh,
  isRefreshing = false,
}: SiteVisitToolbarProps) {
  const rangeIsValid = !dateFrom || !dateTo || dateFrom <= dateTo;

  return (
    <div className="flex flex-col gap-3 p-4 lg:flex-row lg:flex-wrap lg:items-start">
      <TextField
        size="small"
        type="search"
        placeholder="Search name, mobile, email or visit ID…"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        className="lg:min-w-72 lg:flex-1 xl:max-w-sm"
        slotProps={{
          htmlInput: { maxLength: SEARCH_MAX_LENGTH, 'aria-label': 'Search site visits' },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />
      {view === 'list' && (
        <div className="grid grid-cols-2 gap-2 sm:w-80">
          <TextField
            size="small"
            type="date"
            label="Visit from"
            value={dateFrom}
            onChange={(event) => onDateChange(event.target.value, dateTo)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            size="small"
            type="date"
            label="Visit to"
            value={dateTo}
            onChange={(event) => onDateChange(dateFrom, event.target.value)}
            error={!rangeIsValid}
            helperText={rangeIsValid ? undefined : 'Before the start date'}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: dateFrom || undefined } }}
          />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
        {onOpenFilters && (
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
        )}
        {onClear && (
          <Button variant="text" startIcon={<FilterAltOff />} onClick={onClear}>
            Clear filters
          </Button>
        )}
        <ToggleButtonGroup
          size="small"
          exclusive
          value={view}
          onChange={(_, next: SiteVisitView | null) => next && onViewChange(next)}
          aria-label="View"
        >
          <ToggleButton value="list" aria-label="List view">
            <ViewListOutlined fontSize="small" />
          </ToggleButton>
          <ToggleButton value="calendar" aria-label="Calendar view">
            <CalendarMonthOutlined fontSize="small" />
          </ToggleButton>
        </ToggleButtonGroup>
        <Tooltip title="Refresh">
          <span>
            <IconButton
              aria-label="Refresh site visits"
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <Refresh />
            </IconButton>
          </span>
        </Tooltip>
      </div>
    </div>
  );
}
