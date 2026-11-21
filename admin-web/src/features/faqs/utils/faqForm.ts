import type { Path } from 'react-hook-form';

import type { FaqFormValues } from '../schemas/faqSchema';
import type { CreateFaqRequest, Faq, FaqStatus, UpdateFaqRequest } from '../types/faq.types';

/** Form fields the backend's field errors map to (same names as the API). */
export const FAQ_FORM_FIELDS: readonly Path<FaqFormValues>[] = [
  'question',
  'answer',
  'category',
  'status',
  'sortOrder',
];

export function emptyFaqForm(sortOrder = 0): FaqFormValues {
  return { question: '', answer: '', category: '', status: 'draft', sortOrder: String(sortOrder) };
}

export function toFaqFormValues(faq: Faq): FaqFormValues {
  return {
    question: faq.question,
    answer: faq.answer,
    category: faq.category,
    status: faq.status,
    sortOrder: String(faq.sortOrder),
  };
}

export function toCreateFaqRequest(values: FaqFormValues, status: FaqStatus): CreateFaqRequest {
  return {
    question: values.question.trim(),
    answer: values.answer,
    category: values.category,
    status,
    sortOrder: Number(values.sortOrder),
  };
}

/**
 * Only the fields that changed, so an unchanged status never needs the publish permission and an
 * unchanged removed category is not re-validated.
 */
export function toUpdateFaqRequest(
  saved: Faq,
  values: FaqFormValues,
  status: FaqStatus,
): UpdateFaqRequest {
  const request: UpdateFaqRequest = {};
  const question = values.question.trim();
  const sortOrder = Number(values.sortOrder);
  if (question !== saved.question) request.question = question;
  if (values.answer !== saved.answer) request.answer = values.answer;
  if (values.category !== saved.category) request.category = values.category;
  if (status !== saved.status) request.status = status;
  if (sortOrder !== saved.sortOrder) request.sortOrder = sortOrder;
  return request;
}

/** A route `:id` as a positive id, or null. */
export function parseFaqId(value: string | null | undefined): number | null {
  if (!value || !/^\d{1,18}$/.test(value)) return null;
  const id = Number(value);
  return id > 0 && Number.isSafeInteger(id) ? id : null;
}
