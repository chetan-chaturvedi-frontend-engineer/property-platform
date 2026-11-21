import NavigateNext from '@mui/icons-material/NavigateNext';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

export interface Crumb {
  label: string;
  /** Omit for the current page. */
  to?: string;
}

interface PageHeadingProps {
  title: string;
  crumbs: readonly Crumb[];
}

/** Page title with its breadcrumb trail; the last crumb is the current page. */
export function PageHeading({ title, crumbs }: PageHeadingProps) {
  return (
    <div className="min-w-0">
      <Typography variant="h1" className="break-words">
        {title}
      </Typography>
      <Breadcrumbs
        aria-label="Breadcrumb"
        separator={<NavigateNext fontSize="small" />}
        className="mt-1"
      >
        {crumbs.map((crumb) =>
          crumb.to ? (
            <Link key={crumb.label} component={RouterLink} to={crumb.to} underline="hover">
              {crumb.label}
            </Link>
          ) : (
            <Typography key={crumb.label} color="text.secondary" aria-current="page">
              {crumb.label}
            </Typography>
          ),
        )}
      </Breadcrumbs>
    </div>
  );
}
