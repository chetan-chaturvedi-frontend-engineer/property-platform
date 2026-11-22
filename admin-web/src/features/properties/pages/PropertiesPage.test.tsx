import { screen, waitFor, within } from '@testing-library/react';
import { http } from 'msw';

import { createQueryClient } from '@/services/queryClient';
import { useNotificationStore } from '@/store/notificationStore';
import { apiPath, problem } from '@/tests/handlers/problem';
import { mockDb, mockUsers } from '@/tests/mocks/mockDb';
import { server } from '@/tests/mocks/server';
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

/** Captures CSV downloads (jsdom has no object URLs). */
function captureDownloads() {
  const blobs: Blob[] = [];
  Object.assign(URL, {
    createObjectURL: jest.fn((blob: Blob) => {
      blobs.push(blob);
      return 'blob:csv';
    }),
    revokeObjectURL: jest.fn(),
  });
  // jsdom cannot follow the download link ("Not implemented: navigation").
  jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  return blobs;
}

const messages = () => useNotificationStore.getState().queue.map((item) => item.message);

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
    expect(screen.getByText(`Showing 1 to 20 of ${TOTAL} entries`)).toBeInTheDocument();
    const first = await findRow('Dream Heights Apartments');
    expect(first.getAllByText('Pending review')[0]).toBeInTheDocument();
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

  it('shows five compact summary boxes without published, legal review or inactive', async () => {
    signInAs(mockUsers.admin);
    renderPage();

    const stats = screen.getByRole('region', { name: 'Property statistics' });
    expect(await within(stats).findByText(String(TOTAL))).toBeInTheDocument();
    for (const label of ['All properties', 'Pending review', 'Approved', 'Drafts', 'Rejected']) {
      expect(within(stats).getByText(label)).toBeInTheDocument();
    }
    expect(within(stats).queryByText('Published')).not.toBeInTheDocument();
    expect(within(stats).queryByText('Legal review pending')).not.toBeInTheDocument();
    expect(within(stats).queryByText('Inactive')).not.toBeInTheDocument();
  });

  it('shows property, builder, location, price, submitted and status columns', async () => {
    signInAs(mockUsers.admin);
    renderPage();
    await waitForRows(20);

    const headers = within(table())
      .getAllByRole('columnheader')
      .map((header) => header.textContent);
    expect(headers).toEqual([
      'Property',
      'Builder',
      'Location',
      'Price',
      'Submitted on',
      'Status',
      'Actions',
    ]);

    // Property 1: 2 BHK (₹1.05 Cr, 1,350 sq.ft) is its cheapest unit type; 3 BHK costs more.
    const row = await findRow('Dream Heights Apartments');
    expect(row.getByText('Media files:', { exact: false }).parentElement).toHaveTextContent('2');
    expect(row.getByText('2 BHK, 3 BHK')).toBeInTheDocument();
    expect(row.getByText('RERA RAJ/A/2026/1001')).toBeInTheDocument();
    expect(row.getByText('1,350 sq.ft · 1 parking')).toBeInTheDocument();
    expect(row.getByText('Dream Homes Pvt Ltd')).toBeInTheDocument();
    expect(row.getByText('Plot 1, Main Road')).toBeInTheDocument();
    expect(row.getByText('Vaishali Nagar, Jaipur')).toBeInTheDocument();
    expect(row.getByText('Rajasthan')).toBeInTheDocument();
    expect(row.getByText('₹1.05 Cr')).toBeInTheDocument();
    // 1,05,00,000 ÷ 1,350 sq.ft = 7,777.8, rounded.
    expect(row.getByText('₹7,778 / sq.ft')).toBeInTheDocument();
    // "Submitted on" is when the listing was created (2026-11-18 09:00 UTC), in the viewer's time zone.
    const submitted = new Date('2026-11-18T09:00:00Z');
    expect(
      row.getByText(new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(submitted)),
    ).toBeInTheDocument();
    expect(
      row.getByText(new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(submitted)),
    ).toBeInTheDocument();
    expect(row.getAllByText('Pending review')[0]).toBeInTheDocument();

    // A draft without unit types has no price, so no price per sq.ft.
    const draft = await findRow('Urban Square Commercial');
    expect(draft.getByText('— / sq.ft')).toBeInTheDocument();
  });

  it('sorts with the toolbar sort control', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage();
    await waitForRows(20);

    await user.click(screen.getByLabelText('Sort by'));
    await user.click(await screen.findByRole('option', { name: 'Name (Z–A)' }));
    await waitFor(() =>
      expect(within(table()).getAllByRole('row')[1]).toHaveTextContent('Urban Square Commercial'),
    );
  });

  it('shows an overview, recent activity and quick actions in the sidebar', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage();
    await waitForRows(20);

    const overview = await screen.findByRole('region', { name: 'Property overview' });
    expect(await within(overview).findByText('Total properties')).toBeInTheDocument();
    expect(within(overview).getByText(String(TOTAL))).toBeInTheDocument();
    expect(within(overview).getByText('Submitted in 7 days')).toBeInTheDocument();

    const activity = screen.getByRole('region', { name: 'Recent activity' });
    const items = await within(activity).findAllByRole('listitem');
    expect(items).toHaveLength(8);
    // Newest first: property 1 was submitted most recently.
    expect(items[0]).toHaveTextContent('Submitted for review');
    expect(
      within(items[0]!).getByRole('link', { name: 'Dream Heights Apartments' }),
    ).toHaveAttribute('href', '/properties/1');

    const quick = screen.getByRole('region', { name: 'Quick actions' });
    expect(within(quick).getByRole('button', { name: /Add new property/ })).toBeInTheDocument();
    await user.click(within(quick).getByRole('button', { name: /View rejected properties/ }));
    expect(
      await screen.findByRole('tab', { name: /^Rejected/, selected: true }),
    ).toBeInTheDocument();
    await waitFor(() => {
      const rows = within(table()).getAllByRole('row').slice(1);
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) expect(row).toHaveTextContent('Rejected');
    });
  });

  it('refreshes recent activity after a workflow action', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage();
    const row = await findRow('Dream Heights Apartments');
    const activity = screen.getByRole('region', { name: 'Recent activity' });
    await within(activity).findAllByRole('listitem');

    await user.click(row.getByRole('button', { name: 'Approve Dream Heights Apartments' }));
    const dialog = await screen.findByRole('dialog', { name: /Approve: Dream Heights Apartments/ });
    await user.click(within(dialog).getByRole('button', { name: 'Approve' }));

    await waitFor(() =>
      expect(within(activity).getAllByRole('listitem')[0]).toHaveTextContent('Property approved'),
    );
  });

  it('exports every filtered property with full details as CSV', async () => {
    signInAs(mockUsers.admin);
    const blobs = captureDownloads();
    const { user } = renderPage('/properties?tab=pending_review');
    await waitForRows(5);

    await user.click(screen.getByRole('button', { name: /export csv/i }));

    await waitFor(() => expect(blobs).toHaveLength(1));
    const lines = (await blobs[0]!.text())
      .replace(/^\uFEFF/, '')
      .trim()
      .split('\r\n');
    expect(lines).toHaveLength(6);
    const header = lines[0]!.split(',');
    for (const column of [
      'Property name',
      'Property type',
      'Description',
      'RERA number',
      'BHK configurations',
      'Parking',
      'Builder',
      'Address',
      'City',
      'State',
      'Starting price (INR)',
      'Price per sq.ft (INR)',
      'Thumbnail',
      'Media files',
      'Submitted on (UTC)',
      'Sent for review (UTC)',
      'Status',
      'Legal approval',
      'Review reason',
    ]) {
      expect(header).toContain(column);
    }
    const dream = lines.find((line) => line.startsWith('1,Dream Heights Apartments,'));
    expect(dream).toContain('Premium homes with world-class amenities.');
    expect(dream).toContain('"2 BHK, 3 BHK"');
    expect(dream).toContain(',10500000,7778,');
    expect(dream).toContain(',Pending review,');
    expect(lines.slice(1).every((line) => line.includes(',Pending review,'))).toBe(true);
    expect(messages()).toContain('Exported 5 properties.');
  });

  it('reports a failed export without downloading', async () => {
    signInAs(mockUsers.admin);
    const blobs = captureDownloads();
    const { user } = renderPage();
    await waitForRows(20);
    server.use(
      http.get(apiPath('/admin/properties/:id'), () =>
        problem(500, 'internal_error', 'The server had a problem.'),
      ),
    );

    await user.click(screen.getByRole('button', { name: /export csv/i }));

    await waitFor(() => expect(messages()).toContain('Export failed: The server had a problem.'));
    expect(blobs).toHaveLength(0);
  });
});
