import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import { useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';

import type { BlogFormValues } from '../../schemas/blogSchema';
import { BLOG_LIMITS } from '../../utils/blogDisplay';
import { normalizeTag } from '../../utils/blogSlug';

interface BlogTagsFieldProps {
  /** Existing tags offered as suggestions. */
  suggestions: readonly string[];
  disabled?: boolean;
}

/** Normalizes, de-duplicates and caps the tags; returns an error for the first rejected one. */
function mergeTags(current: readonly string[], typed: readonly string[]) {
  const next = [...current];
  for (const raw of typed) {
    const tag = normalizeTag(raw);
    if (tag === null) return { tags: next, error: `"${raw.trim()}" is not a valid tag` };
    if (!next.includes(tag)) {
      if (next.length >= BLOG_LIMITS.tags) {
        return { tags: next, error: `At most ${BLOG_LIMITS.tags} tags` };
      }
      next.push(tag);
    }
  }
  return { tags: next, error: null };
}

/**
 * Free tags as chips: Enter or comma adds one. Tags are stored lowercase, so they are normalized as
 * the backend does and duplicates are ignored.
 */
export function BlogTagsField({ suggestions, disabled = false }: BlogTagsFieldProps) {
  const { control } = useFormContext<BlogFormValues>();
  const [input, setInput] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);

  return (
    <Controller
      name="tags"
      control={control}
      render={({ field, fieldState: { error } }) => {
        const commit = (typed: readonly string[]) => {
          const result = mergeTags([], typed);
          field.onChange(result.tags);
          setInputError(result.error);
        };
        return (
          <Autocomplete
            multiple
            freeSolo
            filterSelectedOptions
            options={suggestions.filter((tag) => !field.value.includes(tag))}
            value={field.value}
            inputValue={input}
            disabled={disabled}
            onInputChange={(_, value, reason) => {
              // A comma completes the tag being typed.
              if (reason === 'input' && value.includes(',')) {
                const parts = value.split(',');
                const rest = parts.pop() ?? '';
                const result = mergeTags(
                  field.value,
                  parts.filter((part) => part.trim()),
                );
                field.onChange(result.tags);
                setInputError(result.error);
                setInput(rest);
                return;
              }
              setInput(value);
              if (inputError) setInputError(null);
            }}
            onChange={(_, value) => commit(value)}
            onBlur={() => {
              if (input.trim()) {
                const result = mergeTags(field.value, [input]);
                field.onChange(result.tags);
                setInputError(result.error);
                if (!result.error) setInput('');
              }
              field.onBlur();
            }}
            renderValue={(value, getItemProps) =>
              value.map((tag, index) => {
                const { key, ...itemProps } = getItemProps({ index });
                return <Chip key={key} size="small" label={tag} {...itemProps} />;
              })
            }
            renderInput={(params) => (
              <TextField
                {...params}
                inputRef={field.ref}
                label="Tags"
                placeholder={field.value.length === 0 ? 'Enter tags and press Enter…' : undefined}
                error={Boolean(error) || Boolean(inputError)}
                helperText={
                  inputError ??
                  error?.message ??
                  `Help readers find related posts. ${field.value.length} / ${BLOG_LIMITS.tags}`
                }
              />
            )}
          />
        );
      }}
    />
  );
}
