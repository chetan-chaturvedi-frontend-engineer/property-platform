import MenuItem from '@mui/material/MenuItem';
import { useFormContext } from 'react-hook-form';

import { FormTextField } from '@/components/common/Input/FormTextField';

import type { FaqFormValues } from '../../schemas/faqSchema';
import { FAQ_LIMITS, type FaqCategory } from '../../types/faq.types';
import { FAQ_STATUS_OPTIONS } from '../../utils/faqDisplay';

interface FaqSettingsFieldsProps {
  categories: readonly FaqCategory[];
  isCategoriesLoading?: boolean;
  /** Why categories are unavailable (load error); shown under the select. */
  categoriesNote?: string;
  /** A saved category key no longer configured: kept selectable so the FAQ can be saved as is. */
  removedCategory?: string;
  /** Without the publish permission the status cannot be changed. */
  canChangeStatus: boolean;
  disabled?: boolean;
}

/** Category, status and display order of the FAQ form. */
export function FaqSettingsFields({
  categories,
  isCategoriesLoading = false,
  categoriesNote,
  removedCategory,
  canChangeStatus,
  disabled = false,
}: FaqSettingsFieldsProps) {
  const { control } = useFormContext<FaqFormValues>();

  return (
    <div className="flex flex-col gap-5">
      <FormTextField<FaqFormValues>
        name="category"
        control={control}
        select
        label="Category"
        required
        fullWidth
        disabled={disabled || isCategoriesLoading}
        helperText={
          categoriesNote ??
          (removedCategory
            ? 'The saved category was removed from the configuration; choose another to show this FAQ again.'
            : 'Groups the FAQ on the website and app.')
        }
      >
        {categories.map((category) => (
          <MenuItem key={category.key} value={category.key}>
            {category.label}
          </MenuItem>
        ))}
        {removedCategory && (
          <MenuItem value={removedCategory}>{`${removedCategory} (removed)`}</MenuItem>
        )}
      </FormTextField>
      <FormTextField<FaqFormValues>
        name="status"
        control={control}
        select
        label="Status"
        fullWidth
        disabled={disabled || !canChangeStatus}
        helperText={
          canChangeStatus
            ? 'Published FAQs appear publicly within a minute.'
            : 'Changing the status needs the FAQ publish permission.'
        }
      >
        {FAQ_STATUS_OPTIONS.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </FormTextField>
      <FormTextField<FaqFormValues>
        name="sortOrder"
        control={control}
        label="Display order"
        type="number"
        fullWidth
        disabled={disabled}
        helperText="Lower numbers are shown first; equal numbers are allowed."
        slotProps={{ htmlInput: { min: 0, max: FAQ_LIMITS.maxSortOrder, step: 1 } }}
      />
    </div>
  );
}
