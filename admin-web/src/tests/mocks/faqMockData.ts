import type { Faq, FaqCategory } from '@/features/faqs/types/faq.types';

/** A `faqs` row; the label is resolved from the configured categories on every response. */
export type StoredFaq = Omit<Faq, 'categoryLabel'>;

/** Mirrors `app.faq.categories` in the backend's `application.yml`. */
export const MOCK_FAQ_CATEGORIES: readonly FaqCategory[] = [
  { key: 'general', label: 'General' },
  { key: 'billing', label: 'Billing & Payments' },
  { key: 'technical', label: 'Technical Support' },
];

const SEED: ReadonlyArray<
  Pick<StoredFaq, 'question' | 'category' | 'status'> & { answer?: string }
> = [
  {
    question: 'How can I register as an individual seller?',
    category: 'general',
    status: 'publish',
    answer:
      '<p>Open the app, choose <strong>Sign up</strong> and select <em>Individual seller</em>. Verify your phone number to finish.</p>',
  },
  {
    question: 'What is the registration fee for individual sellers?',
    category: 'billing',
    status: 'publish',
  },
  {
    question: 'How many free posts do I get in the individual plan?',
    category: 'general',
    status: 'publish',
  },
  {
    question: 'What happens after my free posts are used?',
    category: 'billing',
    status: 'publish',
  },
  {
    question: 'How can I register as a builder or dealer?',
    category: 'general',
    status: 'publish',
  },
  {
    question: 'What is the registration fee for builders?',
    category: 'billing',
    status: 'publish',
  },
  { question: 'How many free posts do builders get?', category: 'general', status: 'publish' },
  { question: 'What are the charges for additional posts?', category: 'billing', status: 'draft' },
  { question: 'How do I reset my password?', category: 'technical', status: 'publish' },
  { question: 'Why is my listing not visible yet?', category: 'technical', status: 'publish' },
  { question: 'Which payment methods are accepted?', category: 'billing', status: 'publish' },
  { question: 'Can I get a refund for an unused plan?', category: 'billing', status: 'draft' },
  { question: 'How do I upload property photos?', category: 'technical', status: 'publish' },
  { question: 'How do I contact support?', category: 'general', status: 'publish' },
  { question: 'Is my phone number shown to buyers?', category: 'general', status: 'draft' },
  // Its category was removed from the configuration: still listed for admins, hidden publicly.
  { question: 'Old offer terms (archived)', category: 'offers', status: 'publish' },
];

/** 16 FAQs: display order 1…16, updated a few hours apart (newest = lowest order). */
export function buildFaqs(): StoredFaq[] {
  const start = Date.parse('2026-11-18T10:30:00Z');
  return SEED.map((seed, index) => {
    const time = new Date(start - index * 5 * 3_600_000).toISOString();
    return {
      id: index + 1,
      question: seed.question,
      answer: seed.answer ?? `<p>Answer to: ${seed.question}</p>`,
      category: seed.category,
      status: seed.status,
      sortOrder: index + 1,
      createdAt: new Date(Date.parse(time) - 86_400_000).toISOString(),
      updatedAt: time,
    };
  });
}
