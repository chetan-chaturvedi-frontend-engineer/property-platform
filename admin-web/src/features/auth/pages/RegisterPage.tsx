import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { ROUTES } from '@/utils/constants';

import { RegisterForm } from '../components/RegisterForm';
import type { VerificationStatusResponse } from '../types/auth.types';

export function RegisterPage() {
  const [result, setResult] = useState<VerificationStatusResponse | null>(null);

  return (
    <>
      <Typography variant="h2" component="h1" className="mb-1">
        Create an account
      </Typography>
      <Typography color="text.secondary" className="mb-6">
        Dashboard access is granted by an administrator after your account is verified.
      </Typography>
      {result ? (
        <Alert severity="success" role="status">
          {result.message}
        </Alert>
      ) : (
        <RegisterForm onSuccess={setResult} />
      )}
      <Typography variant="body2" color="text.secondary" className="mt-6 text-center">
        Already have an account?{' '}
        <Link component={RouterLink} to={ROUTES.login}>
          Sign in
        </Link>
      </Typography>
    </>
  );
}
