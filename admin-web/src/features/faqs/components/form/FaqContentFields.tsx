import { Controller, useFormContext, useWatch } from 'react-hook-form';

import { FormTextField } from '@/components/common/Input/FormTextField';
import { RichTextEditor } from '@/components/common/RichText';

import type { FaqFormValues } from '../../schemas/faqSchema';
import { FAQ_LIMITS } from '../../types/faq.types';
import { FAQ_RICH_TEXT_FEATURES, htmlToText } from '../../utils/faqDisplay';

interface FaqContentFieldsProps {
  disabled?: boolean;
}

/** Question (plain text) and answer (rich text) of the FAQ form. */
export function FaqContentFields({ disabled = false }: FaqContentFieldsProps) {
  const { control } = useFormContext<FaqFormValues>();
  const question = useWatch({ control, name: 'question' });
  const answer = useWatch({ control, name: 'answer' });
  const answerChars = htmlToText(answer).trim().length;

  return (
    <div className="flex flex-col gap-5">
      <FormTextField<FaqFormValues>
        name="question"
        control={control}
        label="Question"
        placeholder="e.g. How can I register as an individual seller?"
        required
        fullWidth
        multiline
        minRows={2}
        disabled={disabled}
        helperText={`Plain text, shown exactly as typed · ${question.trim().length} / ${FAQ_LIMITS.question}`}
        slotProps={{ htmlInput: { maxLength: FAQ_LIMITS.question } }}
      />
      <Controller
        name="answer"
        control={control}
        render={({ field, fieldState: { error } }) => (
          <RichTextEditor
            label="Answer"
            required
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            placeholder="Write a clear, complete answer…"
            disabled={disabled}
            error={error?.message}
            features={FAQ_RICH_TEXT_FEATURES}
            minHeightClassName="min-h-48"
            footer={`${answerChars.toLocaleString()} characters of text`}
          />
        )}
      />
    </div>
  );
}
