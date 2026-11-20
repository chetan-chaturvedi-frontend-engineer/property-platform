import { screen, waitFor, within } from '@testing-library/react';

import { createQueryClient } from '@/services/queryClient';
import { mockDb, mockUsers } from '@/tests/mocks/mockDb';
import { renderRoutes, signInAs } from '@/tests/utils/testUtils';

import { LeadDetailsPage } from './LeadDetailsPage';

function renderDetails(id: number | string) {
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  return renderRoutes(
    [
      { path: '/leads', element: <p>Lead list</p> },
      { path: '/leads/:id', element: <LeadDetailsPage /> },
    ],
    { initialPath: `/leads/${id}`, queryClient },
  );
}

function actions() {
  return within(screen.getByRole('region', { name: 'Lead actions' }));
}

describe('LeadDetailsPage', () => {
  it('shows the lead, its requirements, preferences, contact links and record', async () => {
    signInAs(mockUsers.admin);
    renderDetails(300);

    expect(await screen.findByRole('heading', { name: 'Rahul Sharma' })).toBeInTheDocument();
    expect(screen.getAllByText('LID-300').length).toBeGreaterThan(0);

    const requirements = within(screen.getByRole('region', { name: 'Requirements' }));
    expect(requirements.getByText('Apartment')).toBeInTheDocument();
    expect(requirements.getByText('2 BHK')).toBeInTheDocument();
    expect(requirements.getByText('Within 1 year')).toBeInTheDocument();

    const preferences = within(screen.getByRole('region', { name: 'Interests & preferences' }));
    expect(preferences.getByText('East')).toBeInTheDocument();
    // Amenity names come from the catalog.
    expect(await preferences.findByText('Gymnasium')).toBeInTheDocument();

    const contact = within(screen.getByRole('region', { name: 'Contact details' }));
    expect(contact.getByRole('link', { name: 'Call +919876543210' })).toHaveAttribute(
      'href',
      'tel:+919876543210',
    );
    expect(contact.getByRole('link', { name: 'Send email' })).toHaveAttribute(
      'href',
      'mailto:rahul.sharma300@example.com',
    );

    const record = within(screen.getByRole('region', { name: 'Record' }));
    expect(record.getAllByText('Asha Admin')).toHaveLength(2);
    expect(screen.getByText(/Looking for a ready to move apartment/)).toBeInTheDocument();
  });

  it('reports a missing or invalid lead', async () => {
    signInAs(mockUsers.admin);
    renderDetails(9999);
    expect(
      await screen.findByText('This lead does not exist or has been deleted.'),
    ).toBeInTheDocument();
  });

  it('reports an invalid id without calling the API', () => {
    signInAs(mockUsers.admin);
    renderDetails('abc');
    expect(screen.getByText('This lead does not exist or has been deleted.')).toBeInTheDocument();
  });

  it('edits the lead and shows the saved values', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderDetails(300);
    await screen.findByRole('heading', { name: 'Rahul Sharma' });

    await user.click(screen.getByRole('button', { name: 'Edit lead' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Edit Rahul Sharma' }));
    const location = dialog.getByRole('textbox', { name: /Preferred location/ });
    await user.clear(location);
    await user.type(location, 'Malviya Nagar, Jaipur');
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mockDb.findLead(300)?.preferredLocation).toBe('Malviya Nagar, Jaipur');
    // Only the changed field was sent, so the rest is untouched.
    expect(mockDb.findLead(300)?.amenities).toEqual(['gymnasium', 'swimming-pool']);
    expect((await screen.findAllByText('Malviya Nagar, Jaipur')).length).toBeGreaterThan(0);
  });

  it('marks a lead as lost only with a reason', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderDetails(300);
    await screen.findByRole('heading', { name: 'Rahul Sharma' });

    await user.click(actions().getByRole('button', { name: 'Mark as lost' }));
    const dialog = within(
      await screen.findByRole('dialog', { name: 'Change status of Rahul Sharma' }),
    );
    await user.click(dialog.getByRole('button', { name: 'Mark as lost' }));
    expect(await dialog.findByText('Give a reason when the lead is lost')).toBeInTheDocument();

    await user.type(dialog.getByRole('textbox', { name: /Lost reason/ }), 'Budget too low');
    await user.click(dialog.getByRole('button', { name: 'Mark as lost' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mockDb.findLead(300)).toMatchObject({ status: 'lost', lostReason: 'Budget too low' });
    expect(await screen.findByText('Budget too low')).toBeInTheDocument();
  });

  it('offers no status change for a converted lead', async () => {
    signInAs(mockUsers.admin);
    renderDetails(294);
    await screen.findByRole('heading', { name: 'Karan Malhotra' });

    expect(actions().queryByRole('button', { name: 'Change status' })).not.toBeInTheDocument();
    expect(actions().queryByRole('button', { name: 'Mark as lost' })).not.toBeInTheDocument();
    expect(actions().getByRole('button', { name: 'Reassign' })).toBeInTheDocument();
  });

  it('reassigns the lead to another user', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderDetails(300);
    await screen.findByRole('heading', { name: 'Rahul Sharma' });

    await user.click(actions().getByRole('button', { name: 'Reassign' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Assign Rahul Sharma' }));
    const input = dialog.getByRole('combobox', { name: 'Assign to' });
    await user.clear(input);
    await user.type(input, 'sam');
    await user.click(await screen.findByRole('option', { name: /Sam Super/ }));
    await user.click(dialog.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mockDb.findLead(300)?.assignedTo).toEqual({ id: 4, fullName: 'Sam Super' });
  });

  it('shows the backend reason when an assignee is not eligible', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderDetails(300);
    await screen.findByRole('heading', { name: 'Rahul Sharma' });

    await user.click(actions().getByRole('button', { name: 'Reassign' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Assign Rahul Sharma' }));
    const input = dialog.getByRole('combobox', { name: 'Assign to' });
    await user.clear(input);
    await user.type(input, 'mira');
    await user.click(await screen.findByRole('option', { name: /Mira Manager/ }));
    await user.click(dialog.getByRole('button', { name: 'Save' }));

    expect(
      await dialog.findByText('must be an active user who can work on this lead'),
    ).toBeInTheDocument();
  });

  it('deletes the lead after confirmation and returns to the list', async () => {
    signInAs(mockUsers.admin);
    const { user, router } = renderDetails(300);
    await screen.findByRole('heading', { name: 'Rahul Sharma' });

    await user.click(actions().getByRole('button', { name: 'Delete lead' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Delete lead?' }));
    await user.click(dialog.getByRole('button', { name: 'Delete lead' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/leads'));
    expect(mockDb.findLead(300)).toBeUndefined();
  });

  it('is read-only for a role without write permissions', async () => {
    signInAs(mockUsers.leadViewer);
    renderDetails(300);
    await screen.findByRole('heading', { name: 'Rahul Sharma' });

    expect(screen.queryByRole('button', { name: 'Edit lead' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Lead actions' })).not.toBeInTheDocument();
  });
});
