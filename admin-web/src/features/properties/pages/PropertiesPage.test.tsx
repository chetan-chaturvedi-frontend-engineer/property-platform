import { screen, waitFor, within } from '@testing-library/react';

import { createQueryClient } from '@/services/queryClient';
import { mockDb, mockUsers } from '@/tests/mocks/mockDb';
import { renderWithProviders, signInAs } from '@/tests/utils/testUtils';

import { PropertiesPage } from './PropertiesPage';

/** The mock has 26 properties: 5 pending review, 5 approved, 6 published, 4 drafts (see propertyMockData). */
const TOTAL = 26;

function renderPage(route = '/properties') {
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  return renderWithProviders(<PropertiesPage />, { queryClient, route });
}

function table() {
  return screen.getByRole('table', { name: 'Properties' });
}

async function findRow(name: string) {
  const cell = await within(table()).findByText(name);
  const row = cell.closest('tr');
  if (!row) throw new Error('row not found');
  return within(row);
}

async function waitForRows(count: number) {
  await waitFor(() => expect(within(table()).getAllByRole('row')).toHaveLength(count + 1));
}

describe('PropertiesPage', () => {
  it('shows server statistics, tab counts and the first page', async () => {
    signInAs(mockUsers.admin);
    renderPage();

    const stats = screen.getByRole('region', { name: 'Property statistics' });
    expect(await within(stats).findByText(String(TOTAL))).toBeInTheDocument();
    expect(within(stats).getByText('Pending review')).toBeInTheDocument();
    expect(await screen.findByRole('tab', { name: 'Pending review (5)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Published (6)' })).toBeInTheDocument();

    await waitForRows(20);
    expect(screen.getByText(`1–20 of ${TOTAL}`)).toBeInTheDocument();
    const first = await findRow('Dream Heights Apartments');
    expect(first.getByText('Pending review')).toBeInTheDocument();
    expect(first.getByText('Dream Homes Pvt Ltd')).toBeInTheDocument();
    expect(first.getByRole('img', { name: 'Dream Heights Apartments' })).toBeInTheDocument();
  });

  it('combines the status tab with debounced search and clears filters', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage();
    await waitForRows(20);

    await user.click(await screen.findByRole('tab', { name: 'Pending review (5)' }));
    await waitForRows(5);
    await user.type(screen.getByRole('searchbox', { name: 'Search properties' }), 'dream');
    await waitForRows(3);
    expect(within(table()).getByText('Dream Heights Apartments 13')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitForRows(20);
    expect(screen.getByRole('searchbox', { name: 'Search properties' })).toHaveValue('');
  });

  it('reads filters from the URL, so they survive navigating back', async () => {
    signInAs(mockUsers.admin);
    renderPage('/properties?tab=draft&q=urban');

    // Search covers the builder too: two "Urban Square" drafts and two drafts by "Urban Infra".
    await waitForRows(4);
    expect(screen.getByRole('tab', { name: 'Drafts (4)', selected: true })).toBeInTheDocument();
    expect(within(table()).getByText('Urban Square Commercial')).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search properties' })).toHaveValue('urban');
  });

  it('sorts on the server when a sortable header is clicked', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage();
    await waitForRows(20);

    await user.click(screen.getByRole('button', { name: 'Property' }));

    await waitFor(() =>
      expect(within(table()).getAllByRole('row')[1]).toHaveTextContent('Dream Heights Apartments'),
    );
    await user.click(screen.getByRole('button', { name: 'Property' }));
    await waitFor(() =>
      expect(within(table()).getAllByRole('row')[1]).toHaveTextContent('Urban Square Commercial'),
    );
  });

  it('approves a pending property from the list and refreshes the counts', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage();
    const row = await findRow('Dream Heights Apartments');

    await user.click(row.getByRole('button', { name: 'Approve Dream Heights Apartments' }));
    const dialog = await screen.findByRole('dialog', { name: /Approve: Dream Heights Apartments/ });
    await user.click(within(dialog).getByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(mockDb.findProperty(1)?.publicationStatus).toBe('approved'));
    expect(await screen.findByRole('tab', { name: 'Pending review (4)' })).toBeInTheDocument();
  });

  it('requires a reason to reject and records it', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage();
    const row = await findRow('Dream Heights Apartments');

    await user.click(row.getByRole('button', { name: 'Reject Dream Heights Apartments' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Reject' }));
    expect(within(dialog).getByText('A reason is required.')).toBeInTheDocument();

    await user.type(
      within(dialog).getByRole('textbox', { name: /Reason/ }),
      'RERA number does not match.',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Reject' }));

    await waitFor(() => expect(mockDb.findProperty(1)?.publicationStatus).toBe('rejected'));
    expect(mockDb.findProperty(1)?.statusHistory.at(-1)?.reason).toBe(
      'RERA number does not match.',
    );
  });

  it('soft-deletes after confirmation and can restore from the Deleted tab', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage();
    const row = await findRow('Skyline Residency');

    await user.click(row.getByRole('button', { name: 'Delete Skyline Residency' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete property?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete property' }));

    await waitFor(() => expect(mockDb.findProperty(2)?.deletedAt).toBeDefined());
    await waitFor(() =>
      expect(within(table()).queryByText('Skyline Residency')).not.toBeInTheDocument(),
    );

    await user.click(await screen.findByRole('tab', { name: 'Deleted (1)' }));
    const deleted = await findRow('Skyline Residency');
    await user.click(deleted.getByRole('button', { name: 'Restore Skyline Residency' }));
    await waitFor(() => expect(mockDb.findProperty(2)?.deletedAt).toBeUndefined());
  });

  it('shows only viewing to a user without write or workflow permissions', async () => {
    signInAs(mockUsers.propertyViewer);
    renderPage();
    const row = await findRow('Dream Heights Apartments');

    expect(row.getByRole('button', { name: 'View Dream Heights Apartments' })).toBeInTheDocument();
    expect(
      row.queryByRole('button', { name: /Approve|Reject|Edit|Delete/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add property' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Deleted/ })).not.toBeInTheDocument();
  });
});
