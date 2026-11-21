import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { createQueryClient } from '@/services/queryClient';
import { useNotificationStore } from '@/store/notificationStore';
import { apiPath, problem } from '@/tests/handlers/problem';
import { mockDb, mockUsers } from '@/tests/mocks/mockDb';
import { server } from '@/tests/mocks/server';
import { renderRoutes, signInAs } from '@/tests/utils/testUtils';
import { STORAGE_KEYS } from '@/utils/constants';

import { SystemLogsPage } from './SystemLogsPage';

/**
 * 42 seeded logs, ids 42 (newest) to 1. Levels cycle success/info/warning (14 warnings), modules
 * cycle faqs, banners, leads, properties, authentication, permissions (7 each). Every fifth has no
 * user, every tenth is a background job. See buildLogs in mockDb.
 */
const TOTAL = 42;
const PAGE = 10;
const LONG_FLOW_MS = 30_000;

function renderPage(path = '/system-logs') {
  window.localStorage.setItem(STORAGE_KEYS.systemLogsPageSize, JSON.stringify(PAGE));
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  return renderRoutes([{ path: '/system-logs', element: <SystemLogsPage /> }], {
    initialPath: path,
    queryClient,
  });
}

const table = () => screen.getByRole('table', { name: 'System logs' });
const dataRows = () => within(table()).getAllByRole('row').slice(1);

async function waitForRows(count: number) {
  await waitFor(() => expect(within(table()).getAllByRole('row')).toHaveLength(count + 1));
}

async function waitForTotal(total: number) {
  await waitFor(() =>
    expect(screen.getByText(new RegExp(`of ${total} entries$`))).toBeInTheDocument(),
  );
}

const messages = () => useNotificationStore.getState().queue.map((item) => item.message);

describe('SystemLogsPage', () => {
  it('shows the overview cards and the newest logs first', async () => {
    signInAs(mockUsers.admin);
    renderPage();

    expect(screen.getByRole('heading', { name: 'System Logs' })).toBeInTheDocument();
    const stats = within(screen.getByRole('region', { name: 'Log statistics' }));
    expect(await stats.findByText(String(TOTAL))).toBeInTheDocument();
    expect(stats.getByText('14')).toBeInTheDocument();
    expect(stats.getByText('7')).toBeInTheDocument();
    expect(stats.getByText("Today's activities")).toBeInTheDocument();

    await waitForRows(PAGE);
    expect(screen.getByText(`Showing 1 to ${PAGE} of ${TOTAL} entries`)).toBeInTheDocument();
    const first = within(dataRows()[0] ?? table());
    expect(first.getByText('#LOG-42')).toBeInTheDocument();
    expect(first.getByText('Asha Admin')).toBeInTheDocument();
    expect(first.getByText('FAQs')).toBeInTheDocument();
    expect(first.getByText('Success')).toBeInTheDocument();
    // Index 9 (#LOG-33) is a background job without a user or request.
    const job = within(within(table()).getByText('#LOG-33').closest('tr') ?? table());
    expect(job.getByText('System')).toBeInTheDocument();
    expect(job.getByText('Background job')).toBeInTheDocument();
  });

  it(
    'searches by action or IP address, filters, sorts and pages while keeping the filters',
    async () => {
      signInAs(mockUsers.admin);
      const { user, router } = renderPage();
      await waitForRows(PAGE);

      await user.type(screen.getByRole('searchbox', { name: /Search system logs/ }), 'faqs');
      // Wait for the debounced value: a partial "f" matches the same rows.
      await waitFor(() => expect(router.state.location.search).toBe('?q=faqs'));
      await waitForTotal(7);
      expect(await screen.findByText('Action contains: faqs')).toBeInTheDocument();

      await user.clear(screen.getByRole('searchbox', { name: /Search system logs/ }));
      await user.type(
        screen.getByRole('searchbox', { name: /Search system logs/ }),
        '198.51.100.24',
      );
      await waitFor(() => expect(router.state.location.search).toBe('?q=198.51.100.24'));
      await waitForTotal(13);
      expect(screen.getByText('IP address: 198.51.100.24')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Clear all' }));
      await waitForTotal(TOTAL);

      await user.click(screen.getByRole('combobox', { name: 'Log level' }));
      await user.click(screen.getByRole('option', { name: 'Warning' }));
      await waitForTotal(14);
      expect(dataRows().every((row) => within(row).queryByText('Warning'))).toBe(true);

      await user.click(screen.getByRole('button', { name: 'Go to page 2' }));
      await waitForRows(4);
      expect(router.state.location.search).toBe('?level=warning&page=1');
      expect(screen.getByText('Showing 11 to 14 of 14 entries')).toBeInTheDocument();

      // A new filter starts again at page 1 and keeps the level.
      await user.click(screen.getByRole('combobox', { name: 'Module' }));
      await user.click(screen.getByRole('option', { name: 'Access control' }));
      await waitForTotal(7);
      expect(router.state.location.search).toBe('?level=warning&module=permissions');

      await user.click(screen.getByRole('button', { name: 'Clear all' }));
      await waitForRows(PAGE);
      await user.click(screen.getByRole('button', { name: 'ID' }));
      await waitFor(() =>
        expect(within(dataRows()[0] ?? table()).getByText('#LOG-1')).toBeTruthy(),
      );
      expect(router.state.location.search).toBe('?sort=id&dir=asc');
    },
    LONG_FLOW_MS,
  );

  it(
    'filters by user, custom date range and reference id from the filter panel',
    async () => {
      signInAs(mockUsers.admin);
      const { user, router } = renderPage();
      await waitForRows(PAGE);

      await user.click(screen.getByRole('button', { name: 'Filter' }));
      const panel = within(await screen.findByRole('region', { name: 'System log filters' }));
      await user.type(panel.getByRole('combobox', { name: 'User' }), 'asha');
      await user.click(await screen.findByRole('option', { name: /Asha Admin/ }));

      await user.click(panel.getByRole('combobox', { name: 'Date range' }));
      await user.click(screen.getByRole('option', { name: 'Custom range' }));
      await user.type(panel.getByLabelText('From'), '2026-11-18');
      await user.type(panel.getByLabelText('To'), '2026-11-17');
      await user.click(panel.getByRole('button', { name: 'Apply filters' }));
      expect(panel.getByRole('alert')).toHaveTextContent('The end date is before the start.');

      await user.clear(panel.getByLabelText('To'));
      await user.type(panel.getByLabelText('To'), '2026-11-18');
      await user.click(panel.getByRole('button', { name: 'Apply filters' }));

      await waitFor(() =>
        expect(router.state.location.search).toBe(
          '?user=1&userName=Asha+Admin&range=custom&from=2026-11-18&to=2026-11-18',
        ),
      );
      expect(screen.getByText('User: Asha Admin')).toBeInTheDocument();
      await waitFor(() => expect(dataRows().length).toBeGreaterThan(0));
      expect(within(table()).queryByText('System')).not.toBeInTheDocument();

      await user.click(screen.getByLabelText('Remove filter User: Asha Admin'));
      await user.click(screen.getByRole('button', { name: /Filter/ }));
      const reopened = within(await screen.findByRole('region', { name: 'System log filters' }));
      await user.type(reopened.getByRole('textbox', { name: 'Reference ID' }), '10');
      await user.click(reopened.getByRole('button', { name: 'Apply filters' }));
      await waitForTotal(1);
      expect(within(table()).getByText('#LOG-42')).toBeInTheDocument();
    },
    LONG_FLOW_MS,
  );

  it('opens the read-only details, masks credentials and filters by the log user', async () => {
    signInAs(mockUsers.admin);
    server.use(
      http.get(apiPath('/admin/system-logs/:id'), ({ params }) => {
        const log = mockDb.logs().find((row) => row.id === Number(params.id));
        return HttpResponse.json({
          ...log,
          additionalData: { status: 200, faqId: '12', password: 'should-never-show' },
        });
      }),
    );
    const { user, router } = renderPage();
    await waitForRows(PAGE);

    await user.click(screen.getByRole('button', { name: 'View details of #LOG-42' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'System log details' }));
    expect(dialog.getByText('admin@example.com')).toBeInTheDocument();
    expect(dialog.getByText('/api/v1/admin/faqs')).toBeInTheDocument();
    expect(dialog.getByText('Chrome on macOS')).toBeInTheDocument();
    expect(dialog.getByText('Record #10')).toBeInTheDocument();
    const json = await dialog.findByLabelText('Additional data as JSON');
    await waitFor(() => expect(json).toHaveTextContent('"faqId": "12"'));
    expect(json).toHaveTextContent('••••••');
    expect(json).not.toHaveTextContent('should-never-show');
    expect(dialog.queryByRole('button', { name: /edit|delete/i })).not.toBeInTheDocument();

    await user.click(dialog.getByRole('button', { name: "Show this user's activity" }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'System log details' })).not.toBeInTheDocument(),
    );
    expect(router.state.location.search).toBe('?user=1&userName=Asha+Admin');
  });

  it('flags warnings in the details', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage('/system-logs?level=warning');
    await waitForTotal(14);

    await user.click(screen.getByRole('button', { name: 'View details of #LOG-40' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'System log details' }));
    expect(
      dialog.getByText(/failed attempt, access denial or risky operation/),
    ).toBeInTheDocument();
    expect(dialog.getAllByText('Access denied: leads').length).toBeGreaterThan(0);
  });

  it('hides details and the user filter without their permissions', async () => {
    signInAs(mockUsers.logViewer);
    const { user } = renderPage();
    await waitForRows(PAGE);

    expect(screen.queryByRole('button', { name: /View details of/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Details' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Filter' }));
    const panel = within(await screen.findByRole('region', { name: 'System log filters' }));
    expect(panel.queryByRole('combobox', { name: 'User' })).not.toBeInTheDocument();
  });

  it('shows a filtered empty state that clears the filters', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderPage('/system-logs?q=nothing-matches-this');

    expect(await screen.findByText('No matching logs')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitForRows(PAGE);
  });

  it('shows an error state with retry when the logs cannot be loaded', async () => {
    signInAs(mockUsers.admin);
    server.use(
      http.get(apiPath('/admin/system-logs'), () =>
        problem(500, 'internal_error', 'Something went wrong on our side.'),
      ),
    );
    const { user } = renderPage();

    expect(await screen.findByText('Could not load data')).toBeInTheDocument();
    expect(await screen.findByText(/Could not load log statistics/)).toBeInTheDocument();
    server.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitForRows(PAGE);
  });

  it('exports the filtered logs as CSV', async () => {
    signInAs(mockUsers.admin);
    const createObjectURL = jest.fn(() => 'blob:logs');
    const revokeObjectURL = jest.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const { user } = renderPage('/system-logs?level=warning');
    await waitForTotal(14);

    await user.click(screen.getByRole('button', { name: 'Export logs' }));

    await waitFor(() => expect(messages()).toContain('Exported 14 logs.'));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    click.mockRestore();
  });
});
