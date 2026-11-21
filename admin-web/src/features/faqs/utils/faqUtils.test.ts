import { toFaqFilters } from '../hooks/useFaqListParams';
import { faqFormSchema } from '../schemas/faqSchema';
import type { Faq } from '../types/faq.types';

import { categoryTone, htmlToText } from './faqDisplay';
import {
  emptyFaqForm,
  parseFaqId,
  toCreateFaqRequest,
  toFaqFormValues,
  toUpdateFaqRequest,
} from './faqForm';

const SAVED: Faq = {
  id: 7,
  question: 'How do I pay?',
  answer: '<p>By card.</p>',
  category: 'billing',
  categoryLabel: 'Billing & Payments',
  status: 'publish',
  sortOrder: 4,
  createdAt: '2026-11-01T10:00:00Z',
  updatedAt: '2026-11-02T10:00:00Z',
};

const CATEGORIES = [
  { key: 'general', label: 'General' },
  { key: 'billing', label: 'Billing & Payments' },
];

describe('FAQ form mapping', () => {
  it('builds a create request with a trimmed question and numeric order', () => {
    const values = {
      ...emptyFaqForm(3),
      question: '  Q?  ',
      answer: '<p>A</p>',
      category: 'general',
    };
    expect(toCreateFaqRequest(values, 'publish')).toEqual({
      question: 'Q?',
      answer: '<p>A</p>',
      category: 'general',
      status: 'publish',
      sortOrder: 3,
    });
  });

  it('sends only changed fields on update', () => {
    const values = toFaqFormValues(SAVED);
    expect(toUpdateFaqRequest(SAVED, values, 'publish')).toEqual({});
    expect(
      toUpdateFaqRequest(
        SAVED,
        { ...values, question: ' How do I pay? ', sortOrder: '9' },
        'draft',
      ),
    ).toEqual({ sortOrder: 9, status: 'draft' });
  });

  it('parses route ids strictly', () => {
    expect(parseFaqId('12')).toBe(12);
    expect(parseFaqId('0')).toBeNull();
    expect(parseFaqId('1e3')).toBeNull();
    expect(parseFaqId(undefined)).toBeNull();
  });
});

describe('faqFormSchema', () => {
  const valid = {
    question: 'Q?',
    answer: '<p>A</p>',
    category: 'general',
    status: 'draft',
    sortOrder: '0',
  };

  it('accepts a valid FAQ', () => {
    expect(faqFormSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    [{ question: '   ' }, 'Enter the question'],
    [{ question: 'x'.repeat(501) }, 'The question must be at most 500 characters'],
    [{ answer: '<p> </p>' }, 'Write the answer'],
    [{ category: '' }, 'Select a category'],
    [{ sortOrder: '-1' }, 'Enter a whole number (0 or more)'],
    [{ sortOrder: '1.5' }, 'Enter a whole number (0 or more)'],
    [{ sortOrder: '100001' }, 'At most 100,000'],
  ])('rejects %o', (override, message) => {
    const result = faqFormSchema.safeParse({ ...valid, ...override });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(message);
  });
});

describe('FAQ display helpers', () => {
  it('maps list state to API filters, leaving defaults out', () => {
    expect(
      toFaqFilters({
        search: '  fee ',
        category: '',
        status: undefined,
        sort: { field: 'sortOrder', direction: 'asc' },
      }),
    ).toEqual({ search: 'fee', category: undefined, status: undefined, sort: undefined });
    expect(
      toFaqFilters({
        search: '',
        category: 'billing',
        status: 'draft',
        sort: { field: 'updatedAt', direction: 'desc' },
      }),
    ).toEqual({ search: undefined, category: 'billing', status: 'draft', sort: 'updatedAt,desc' });
  });

  it('gives categories stable tones by configured position, neutral when removed', () => {
    expect(categoryTone('general', CATEGORIES)).toBe('primary');
    expect(categoryTone('billing', CATEGORIES)).toBe('info');
    expect(categoryTone('offers', CATEGORIES)).toBe('neutral');
  });

  it('extracts visible text from answer HTML', () => {
    expect(htmlToText('<p>Hello <strong>there</strong></p>')).toBe('Hello there');
    expect(htmlToText('')).toBe('');
  });
});
