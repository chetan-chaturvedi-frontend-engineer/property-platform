import { screen } from '@testing-library/react';

import { renderWithProviders } from '@/tests/utils/testUtils';

import { Button } from './Button';

describe('Button', () => {
  it('renders its label as a contained button by default', () => {
    renderWithProviders(<Button>Save</Button>);

    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeEnabled();
    expect(button).toHaveClass('MuiButton-contained');
  });

  it('calls onClick when clicked', async () => {
    const onClick = jest.fn();
    const { user } = renderWithProviders(<Button onClick={onClick}>Save</Button>);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled and marked busy while loading, and ignores clicks', async () => {
    const onClick = jest.fn();
    const { user } = renderWithProviders(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );

    const button = screen.getByRole('button', { name: /save/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('respects disabled and variant props', () => {
    renderWithProviders(
      <Button disabled variant="outlined">
        Cancel
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Cancel' });
    expect(button).toBeDisabled();
    expect(button).toHaveClass('MuiButton-outlined');
    expect(button).not.toHaveAttribute('aria-busy');
  });
});
