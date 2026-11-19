import { screen, waitFor, within } from '@testing-library/react';

import { createQueryClient } from '@/services/queryClient';
import { mockDb, mockUsers } from '@/tests/mocks/mockDb';
import { renderRoutes, signInAs } from '@/tests/utils/testUtils';

import { PropertyWizardPage } from './PropertyWizardPage';

/** Fixture ids: 4 is an incomplete draft (no location), 5 is complete and rejected. */
const DRAFT_ID = 4;
const REJECTED_ID = 5;

function renderWizard(path: string) {
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  return renderRoutes(
    [
      { path: '/properties/new', element: <PropertyWizardPage /> },
      { path: '/properties/:id/edit', element: <PropertyWizardPage /> },
      { path: '/properties/:id', element: <p>Property details page</p> },
    ],
    { initialPath: path, queryClient },
  );
}

describe('PropertyWizardPage', () => {
  it('validates step 1, creates the draft and moves on to the location', async () => {
    signInAs(mockUsers.admin);
    const before = mockDb.properties().length;
    const { user, router } = renderWizard('/properties/new');

    await user.click(await screen.findByRole('button', { name: 'Create draft and continue' }));
    expect(await screen.findByText('Enter project name')).toBeInTheDocument();
    expect(mockDb.properties()).toHaveLength(before);

    await user.type(screen.getByRole('textbox', { name: /Project name/ }), 'Lake Shore Homes');
    await user.type(
      screen.getByRole('textbox', { name: /Builder \/ company name/ }),
      'Shore Builders',
    );
    await user.type(screen.getByRole('textbox', { name: /GST number/ }), '27aapfu0939f1zv');
    await user.type(
      screen.getByRole('textbox', { name: /Project email/ }),
      'sales@shore.example.com',
    );
    await user.type(screen.getByRole('textbox', { name: /Project phone/ }), '98765 43210');
    await user.click(screen.getByRole('button', { name: 'Create draft and continue' }));

    expect(await screen.findByRole('heading', { name: 'Location' })).toBeInTheDocument();
    const created = mockDb.properties()[0];
    expect(created?.details.projectName).toBe('Lake Shore Homes');
    expect(created?.details.gstNumber).toBe('27AAPFU0939F1ZV');
    expect(router.state.location.pathname).toBe(`/properties/${created?.id}/edit`);
    expect(router.state.location.search).toBe('?step=2');
  });

  it('maps server field errors onto the form', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderWizard('/properties/new');

    await user.type(await screen.findByRole('textbox', { name: /Project name/ }), 'Duplicate Name');
    await user.type(
      screen.getByRole('textbox', { name: /Builder \/ company name/ }),
      'Shore Builders',
    );
    await user.type(
      screen.getByRole('textbox', { name: /Project email/ }),
      'sales@shore.example.com',
    );
    await user.type(screen.getByRole('textbox', { name: /Project phone/ }), '98765 43210');
    await user.click(screen.getByRole('button', { name: 'Create draft and continue' }));

    expect(await screen.findByText('is already used by another project')).toBeInTheDocument();
  });

  it('opens the first incomplete step of a draft and saves only changed location fields', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderWizard(`/properties/${DRAFT_ID}/edit`);

    expect(await screen.findByRole('heading', { name: 'Location' })).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: /Address/ }), 'Plot 9, Lake Road');
    await user.type(screen.getByRole('textbox', { name: /Locality/ }), 'Baner');
    await user.type(screen.getByRole('textbox', { name: /^City/ }), 'Pune');
    await user.type(screen.getByRole('textbox', { name: /^State/ }), 'Maharashtra');
    await user.type(screen.getByRole('textbox', { name: /PIN code/ }), '0123');
    await user.type(screen.getByRole('textbox', { name: /Latitude/ }), '18.5');
    await user.click(screen.getByRole('button', { name: 'Save and continue' }));
    expect(await screen.findByText('Enter a 6-digit PIN code')).toBeInTheDocument();
    expect(screen.getByText('Enter both coordinates or neither')).toBeInTheDocument();

    await user.clear(screen.getByRole('textbox', { name: /PIN code/ }));
    await user.type(screen.getByRole('textbox', { name: /PIN code/ }), '411045');
    await user.clear(screen.getByRole('textbox', { name: /Latitude/ }));
    await user.click(screen.getByRole('button', { name: 'Save and continue' }));

    expect(
      await screen.findByRole('heading', { name: 'Unit types and pricing' }),
    ).toBeInTheDocument();
    expect(mockDb.findProperty(DRAFT_ID)?.location).toMatchObject({
      city: 'Pune',
      pincode: '411045',
      landmark: null,
    });
  });

  it('saves unit types, keeping fields the form does not edit', async () => {
    signInAs(mockUsers.admin);
    const stored = mockDb.findProperty(REJECTED_ID);
    const first = stored?.apartments[0];
    if (!stored || !first) throw new Error('fixture missing');
    mockDb.saveProperty({
      ...stored,
      apartments: [
        { ...first, description: 'Corner unit', highlights: ['Park view'] },
        ...stored.apartments.slice(1),
      ],
    });
    const { user } = renderWizard(`/properties/${REJECTED_ID}/edit?step=3`);

    const minArea = await screen.findAllByRole('textbox', { name: /Area from/ });
    await user.clear(screen.getAllByRole('textbox', { name: /Area to/ })[0] as HTMLElement);
    await user.type(screen.getAllByRole('textbox', { name: /Area to/ })[0] as HTMLElement, '10');
    await user.click(screen.getByRole('button', { name: 'Save and continue' }));
    expect(await screen.findByText('Must not be less than the minimum')).toBeInTheDocument();

    await user.clear(screen.getAllByRole('textbox', { name: /Area to/ })[0] as HTMLElement);
    await user.type(screen.getAllByRole('textbox', { name: /Area to/ })[0] as HTMLElement, '2000');
    expect(minArea).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Save and continue' }));

    expect(await screen.findByRole('heading', { name: 'Project information' })).toBeInTheDocument();
    const saved = mockDb.findProperty(REJECTED_ID)?.apartments[0];
    expect(saved?.areaMax).toBe(2000);
    expect(saved?.description).toBe('Corner unit');
    expect(saved?.highlights).toEqual(['Park view']);
  });

  it('saves the amenity selection', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderWizard(`/properties/${REJECTED_ID}/edit?step=5`);

    await user.click(await screen.findByRole('checkbox', { name: 'Lift' }));
    await user.click(screen.getByRole('checkbox', { name: 'Gymnasium' }));
    await user.click(screen.getByRole('button', { name: 'Save and continue' }));

    expect(await screen.findByRole('heading', { name: 'Media' })).toBeInTheDocument();
    const names = mockDb.findProperty(REJECTED_ID)?.amenities.map((a) => a.name);
    expect(names).toContain('Lift');
    expect(names).not.toContain('Gymnasium');
  });

  it('checks uploads before sending them and rejects unsupported 3D tour hosts', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderWizard(`/properties/${REJECTED_ID}/edit?step=6`);

    const input = await screen.findByLabelText('File to upload');
    await user.upload(input, new File(['<svg/>'], 'logo.png', { type: 'image/png' }));
    expect(await screen.findByText(/Unsupported file type/)).toBeInTheDocument();

    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
    await user.upload(input, new File([png], 'front.png', { type: 'image/png' }));
    await waitFor(() => expect(mockDb.findProperty(REJECTED_ID)?.media).toHaveLength(3));

    await user.type(
      screen.getByRole('textbox', { name: /3D tour link/ }),
      'https://evil.example.com/tour',
    );
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText(/Use an https link on matterport.com/)).toBeInTheDocument();
  });

  it('lists what is missing and keeps submit disabled for an incomplete draft', async () => {
    signInAs(mockUsers.admin);
    renderWizard(`/properties/${DRAFT_ID}/edit?step=7`);

    expect(await screen.findByRole('heading', { name: 'Preview and submit' })).toBeInTheDocument();
    const location = screen.getByRole('region', { name: '2. Location' });
    expect(within(location).getByText(/Missing: Project address, City/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit for review' })).toBeDisabled();
  });

  it('submits a complete property for review and opens its details', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderWizard(`/properties/${REJECTED_ID}/edit?step=7`);

    const submit = await screen.findByRole('button', { name: 'Submit for review' });
    await waitFor(() => expect(submit).toBeEnabled());
    await user.click(submit);

    expect(await screen.findByText('Property details page')).toBeInTheDocument();
    expect(mockDb.findProperty(REJECTED_ID)?.publicationStatus).toBe('pending_review');
  });
});
