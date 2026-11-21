import { z } from 'zod';

import { FAQ_LIMITS, FAQ_STATUSES } from '../types/faq.types';
import { htmlToText } from '../utils/faqDisplay';

/** Client-side mirror of `CreateFaqRequest` / `UpdateFaqRequest`; the backend repeats every check. */
export const faqFormSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, 'Enter the question')
    .max(FAQ_LIMITS.question, `The question must be at most ${FAQ_LIMITS.question} characters`),
  answer: z
    .string()
    .max(FAQ_LIMITS.answer, 'The answer is too long; shorten it or split it into several FAQs')
    .refine((html) => htmlToText(html).trim() !== '', 'Write the answer'),
  category: z.string().min(1, 'Select a category'),
  status: z.enum(FAQ_STATUSES),
  /** Kept as the input's text so an empty or partial value can be reported, not coerced. */
  sortOrder: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Enter a whole number (0 or more)')
    .refine(
      (value) => Number(value) <= FAQ_LIMITS.maxSortOrder,
      `At most ${FAQ_LIMITS.maxSortOrder.toLocaleString()}`,
    ),
});

export type FaqFormValues = z.infer<typeof faqFormSchema>;
