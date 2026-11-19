import { screen, waitFor, within } from '@testing-library/react';

import { createQueryClient } from '@/services/queryClient';
import { mockDb, mockUsers } from '@/tests/mocks/mockDb';
import { renderRoutes, signInAs } from '@/tests/utils/testUtils';

import { PropertyDetailsPage } from './PropertyDetailsPage';

function renderDetails(id: number | string) {
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  return renderRoutes(
    [
      { path: '/properties', element: <p>Property list</p> },
      { path: '/properties/:id', element: <PropertyDetailsPage /> },
      { path: '/properties/:id/edit', element: <p>Property wizard</p> },
    ],
    { initialPath: `/properties/${id}`, queryClient },
  );
}

function workflow() {
  return screen.getByRole('complementary', { name: 'Review and workflow' });
}

describe('PropertyDetailsPage', () => {
  it('shows the property, its review checklist and the actions the admin may take', async () => {
    signInAs(mockUsers.admin);
    renderDetails(1);

    expect(
      await screen.findByRole('heading', { name: 'Dream Heights Apartments' }),
    ).toBeInTheDocument();
    expect(screen.getByText('RAJ/A/2026/1001')).toBeInTheDocument();
    const panel = within(workflow());
    expect(panel.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(panel.getByRole('button', { name: 'Reject' })).toBeInTheDocument();
    expect(panel.getByRole('button', { name: 'Legal review' })).toBeInTheDocument();
    expect(panel.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
    expect(panel.getAllByText('Complete')).toHaveLength(6);
  });

  it('switches between the detail tabs', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderDetails(1);
    await screen.findByRole('heading', { name: 'Dream Heights Apartments' });

    await user.click(screen.getByRole('tab', { name: 'Pricing & units (2)' }));
    expect(screen.getByRole('table', { name: 'Unit types' })).toBeInTheDocument();
    expect(screen.getByText('Minimum starting price')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Amenities & location/ }));
    expect(screen.getByText('Swimming Pool')).toBeInTheDocument();
    expect(screen.getByText('Vaishali Nagar')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Activity log' }));
    expect(screen.getByText('Submitted for review')).toBeInTheDocument();
  });

  it('records a legal decision, requiring a reason to reject', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderDetails(1);
    await screen.findByRole('heading', { name: 'Dream Heights Apartments' });
    await user.click(within(workflow()).getByRole('button', { name: 'Legal review' }));

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('combobox', { name: 'Legal approval status' }));
    await user.click(await screen.findByRole('option', { name: 'Legal rejected' }));
    await user.click(within(dialog).getByRole('button', { name: 'Save decision' }));
    expect(within(dialog).getByText('A reason is required to reject.')).toBeInTheDocument();

    await user.type(within(dialog).getByRole('textbox', { name: /Reason/ }), 'NOC missing.');
    await user.click(within(dialog).getByRole('button', { name: 'Save decision' }));

    await waitFor(() =>
      expect(mockDb.findProperty(1)?.projectInfo.legalApprovalStatus).toBe('rejected'),
    );
    expect(await within(workflow()).findByText(/NOC missing\./)).toBeInTheDocument();
  });

  it('warns before publishing a property whose legal review is pending', async () => {
    signInAs(mockUsers.admin);
    const stored = mockDb.findProperty(2);
    if (!stored) throw new Error('fixture missing');
    mockDb.saveProperty({
      ...stored,
      projectInfo: { ...stored.projectInfo, legalApprovalStatus: 'pending' },
    });
    const { user } = renderDetails(2);
    await screen.findByRole('heading', { name: 'Skyline Residency' });

    await user.click(within(workflow()).getByRole('button', { name: 'Publish' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Legal review status is/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Publish' }));

    await waitFor(() => expect(mockDb.findProperty(2)?.publicationStatus).toBe('published'));
  });

  it('explains a version conflict instead of overwriting newer data', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderDetails(1);
    await screen.findByRole('heading', { name: 'Dream Heights Apartments' });
    const stored = mockDb.findProperty(1);
    if (!stored) throw new Error('fixture missing');
    // Someone else saved the property after this page loaded it.
    mockDb.saveProperty({ ...stored, version: stored.version + 5 });

    await user.click(within(workflow()).getByRole('button', { name: 'Approve' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Approve' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/changed by someone else/);
    expect(mockDb.findProperty(1)?.publicationStatus).toBe('pending_review');
  });

  it('hides every change for a view-only user', async () => {
    signInAs(mockUsers.propertyViewer);
    renderDetails(1);

    await screen.findByRole('heading', { name: 'Dream Heights Apartments' });
    expect(within(workflow()).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('deletes after confirmation and returns to the list', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderDetails(3);
    await screen.findByRole('heading', { name: 'Green Valley Villas' });

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete property' }),
    );

    expect(await screen.findByText('Property list')).toBeInTheDocument();
    expect(mockDb.findProperty(3)?.deletedAt).toBeDefined();
  });

  it('reports unknown and invalid ids as not found', async () => {
    signInAs(mockUsers.admin);
    renderDetails(9999);
    expect(
      await screen.findByText('This property does not exist or has been deleted.'),
    ).toBeInTheDocument();
  });
});
