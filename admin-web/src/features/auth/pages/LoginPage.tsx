import Typography from '@mui/material/Typography';
import { type Location, useLocation, useNavigate } from 'react-router-dom';

import { ROUTES } from '@/utils/constants';

import { LoginForm } from '../components/LoginForm';

/** Only same-app paths are accepted as a return target, so the redirect cannot leave the app. */
function returnPath(state: unknown): string {
  const from = (state as { from?: Location } | null)?.from;
  const path = from ? `${from.pathname}${from.search}` : '';
  return path.startsWith('/') && !path.startsWith('//') && path !== ROUTES.login
    ? path
    : ROUTES.dashboard;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <>
      <Typography variant="h2" component="h1" className="mb-1">
        Sign in
      </Typography>
      <Typography color="text.secondary" className="mb-6">
        Use the account your administrator gave you.
      </Typography>
      {/* No self-registration link: dashboard accounts are created by an administrator. */}
      <LoginForm onSuccess={() => void navigate(returnPath(location.state), { replace: true })} />
    </>
  );
}
