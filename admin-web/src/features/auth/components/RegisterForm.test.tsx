import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { apiPath } from '@/tests/handlers/problem';
import { server } from '@/tests/mocks/server';
import { renderWithProviders } from '@/tests/utils/testUtils';

import { RegisterForm } from './RegisterForm';

const VALID = {
  fullName: 'Ravi Kumar',
  email: 'ravi@example.com',
  phone: '+91 98765 43210',
  password: 'Str0ng!Pass',
};

function setup() {
  const onSuccess = jest.fn();
  const utils = renderWithProviders(<RegisterForm onSuccess={onSuccess} />);
  const fields = {
    fullName: screen.getByLabelText(/full name/i),
    email: screen.getByLabelText(/^email/i),
    phone: screen.getByLabelText(/^phone/i),
    password: screen.getByLabelText(/^password/i),
    confirm: screen.getByLabelText(/confirm password/i),
  };
  const submit = () => utils.user.click(screen.getByRole('button', { name: /create account/i }));
  const fillValid = async (overrides: Partial<typeof VALID & { confirm: string }> = {}) => {
    const values = { ...VALID, confirm: VALID.password, ...overrides };
    await utils.user.type(fields.fullName, values.fullName);
    await utils.user.type(fields.email, values.email);
    await utils.user.type(fields.phone, values.phone);
    await utils.user.type(fields.password, values.password);
    await utils.user.type(fields.confirm, values.confirm);
  };
  return { ...utils, onSuccess, fields, submit, fillValid };
}

describe('RegisterForm', () => {
  it('shows field errors for an empty submission without calling the API', async () => {
    const { submit, onSuccess, fields } = setup();

    await submit();

    expect(await screen.findByText('Name must be at least 2 characters')).toBeInTheDocument();
    expect(screen.getByText('Enter your email address')).toBeInTheDocument();
    expect(screen.getByText('Enter your phone number')).toBeInTheDocument();
    expect(screen.getByText('Confirm your password')).toBeInTheDocument();
    expect(fields.fullName).toHaveAttribute('aria-invalid', 'true');
    // The first invalid field receives focus.
    expect(fields.fullName).toHaveFocus();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('validates email format and password strength', async () => {
    const { user, fields, submit } = setup();

    await user.type(fields.email, 'not-an-email');
    await user.type(fields.password, 'weakpass');
    await submit();

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Must contain an uppercase letter')).toBeInTheDocument();
  });

  it('reports mismatched passwords on the confirmation field (form-level rule)', async () => {
    const { fillValid, submit, fields } = setup();

    await fillValid({ confirm: 'Different!1' });
    await submit();

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(fields.confirm).toHaveAttribute('aria-invalid', 'true');
  });

  it('submits valid data, shows a loading state, and reports success', async () => {
    // The response is held until the test has checked the loading state, so timing cannot matter.
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.post(apiPath('/auth/register'), async () => {
        await held;
        return HttpResponse.json(
          {
            message: 'Verification required.',
            status: 'pending',
            emailVerified: false,
            phoneVerified: false,
          },
          { status: 201 },
        );
      }),
    );
    const { fillValid, submit, onSuccess } = setup();

    await fillValid();
    await submit();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled(),
    );
    release();
    await waitFor(() =>
      expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending' })),
    );
  });

  it('puts server-side validation errors on the matching field', async () => {
    server.use(
      http.post(apiPath('/auth/register'), () =>
        HttpResponse.json(
          {
            status: 400,
            code: 'validation_failed',
            detail: 'Validation failed',
            errors: { phone: 'must be a valid phone number' },
          },
          { status: 400 },
        ),
      ),
    );
    const { fillValid, submit, fields, onSuccess } = setup();

    await fillValid();
    await submit();

    expect(await screen.findByText('must be a valid phone number')).toBeInTheDocument();
    expect(fields.phone).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('shows a form-level alert for errors that belong to no field', async () => {
    const { fillValid, submit } = setup();

    await fillValid({ email: 'taken@example.com' });
    await submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'An account with this email or phone already exists.',
    );
  });
});
