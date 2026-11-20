import { buildLeads } from '@/tests/mocks/leadMockData';

import { leadFormSchema } from '../schemas/leadSchema';

import { EMPTY_LEAD_FORM, toCreateRequest, toLeadFormValues, toUpdateRequest } from './leadForm';

const lead = buildLeads(1)[0];
if (!lead) throw new Error('mock lead missing');

describe('leadForm', () => {
  it('sends only filled fields on create, so server defaults apply to the rest', () => {
    const request = toCreateRequest(
      {
        ...EMPTY_LEAD_FORM,
        leadName: 'Ravi',
        phone: '98765 43210',
        purpose: 'buy',
        budgetMin: '5000000',
        amenities: ['gymnasium'],
        assignee: { id: 4, fullName: 'Sam Super', email: 'super@example.com' },
      },
      { includeAmenities: false },
    );

    expect(request).toEqual({
      leadName: 'Ravi',
      phone: '98765 43210',
      purpose: 'buy',
      source: 'other',
      status: 'new',
      priority: 'medium',
      budgetMin: 5000000,
      budgetCurrency: 'INR',
      loanRequired: false,
      assignedTo: 4,
    });
  });

  it('sends nothing for an unchanged lead and only the changed fields otherwise', () => {
    const values = toLeadFormValues(lead);
    expect(toUpdateRequest(lead, values)).toEqual({});

    expect(
      toUpdateRequest(lead, { ...values, priority: 'urgent', email: '', amenities: ['gymnasium'] }),
    ).toEqual({ priority: 'urgent', email: null, amenities: ['gymnasium'] });
  });

  it('applies the cross-field rules of the backend', () => {
    const result = leadFormSchema.safeParse({
      ...EMPTY_LEAD_FORM,
      leadName: 'Ravi',
      phone: '98765 43210',
      purpose: 'buy',
      budgetMin: '200',
      budgetMax: '100',
      area: '900',
      status: 'lost',
    });

    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((issue) => issue.path.join('.'));
    expect(paths).toEqual(expect.arrayContaining(['budgetMax', 'areaUnit', 'lostReason']));
  });
});
