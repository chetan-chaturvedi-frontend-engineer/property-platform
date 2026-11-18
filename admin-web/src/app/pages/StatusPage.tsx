import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { ROUTES } from '@/utils/constants';

interface StatusPageProps {
  code: string;
  title: string;
  message: string;
}

function StatusPage({ code, title, message }: StatusPageProps) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <Typography variant="overline" fontSize="1rem" className="text-primary-strong">
        {code}
      </Typography>
      <Typography variant="h1">{title}</Typography>
      <Typography color="text.secondary" className="max-w-md">
        {message}
      </Typography>
      <Button variant="contained" component={RouterLink} to={ROUTES.dashboard} className="mt-4">
        Go to dashboard
      </Button>
    </main>
  );
}

export function NotFoundPage() {
  return (
    <StatusPage
      code="404"
      title="Page not found"
      message="The page you are looking for does not exist or has moved."
    />
  );
}

export function UnauthorizedPage() {
  return (
    <StatusPage
      code="403"
      title="Access denied"
      message="Your role does not include access to this page. Ask an administrator if you need it."
    />
  );
}
