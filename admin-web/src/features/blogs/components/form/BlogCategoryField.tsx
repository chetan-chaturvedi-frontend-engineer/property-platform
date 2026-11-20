import Add from '@mui/icons-material/Add';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { Controller, useFormContext } from 'react-hook-form';

import { Button } from '@/components/common/Button';

import type { BlogFormValues } from '../../schemas/blogSchema';
import type { BlogCategory, BlogCategoryRef } from '../../types/blog.types';

interface BlogCategoryFieldProps {
  categories: readonly BlogCategory[] | undefined;
  isLoading?: boolean;
  /** Why the list is unavailable (no permission, load error); the saved category still shows. */
  unavailableNote?: string;
  /** The saved category, shown even when the list cannot be loaded. */
  savedCategory?: BlogCategoryRef | null;
  /** Opens the quick-add dialog; omitted without permission. */
  onAddCategory?: () => void;
  disabled?: boolean;
}

type Option = Pick<BlogCategory, 'id' | 'title' | 'status'>;

/** Searchable category picker; inactive categories are selectable but flagged. */
export function BlogCategoryField({
  categories,
  isLoading = false,
  unavailableNote,
  savedCategory,
  onAddCategory,
  disabled = false,
}: BlogCategoryFieldProps) {
  const { control } = useFormContext<BlogFormValues>();
  const options: Option[] = [...(categories ?? [])];
  if (savedCategory && !options.some((option) => option.id === savedCategory.id)) {
    options.push(savedCategory);
  }

  return (
    <div className="flex flex-col gap-1">
      <Controller
        name="categoryId"
        control={control}
        render={({ field, fieldState: { error } }) => {
          const selected = options.find((option) => option.id === field.value) ?? null;
          return (
            <Autocomplete
              options={options}
              value={selected}
              loading={isLoading}
              disabled={disabled}
              onChange={(_, option) => field.onChange(option?.id ?? null)}
              onBlur={field.onBlur}
              getOptionLabel={(option) => option.title}
              getOptionKey={(option) => option.id}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderOption={({ key, ...props }, option) => (
                <li key={key} {...props}>
                  <span className="flex w-full items-center justify-between gap-2">
                    {option.title}
                    {option.status === 'inactive' && (
                      <span className="text-xs text-[var(--mui-palette-text-secondary)]">
                        inactive
                      </span>
                    )}
                  </span>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  inputRef={field.ref}
                  label="Category"
                  placeholder="Select category"
                  error={Boolean(error)}
                  helperText={
                    error?.message ??
                    (selected?.status === 'inactive'
                      ? 'This category is inactive: published blogs in it stay hidden until it is activated.'
                      : (unavailableNote ?? 'Required to publish; drafts may leave it empty.'))
                  }
                />
              )}
            />
          );
        }}
      />
      {onAddCategory && (
        <Button
          variant="text"
          size="small"
          startIcon={<Add />}
          onClick={onAddCategory}
          disabled={disabled}
          className="self-start"
        >
          New category
        </Button>
      )}
    </div>
  );
}
