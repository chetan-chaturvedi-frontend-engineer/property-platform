import FormControlLabel from '@mui/material/FormControlLabel';
import ListSubheader from '@mui/material/ListSubheader';
import MenuItem from '@mui/material/MenuItem';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Typography from '@mui/material/Typography';
import { Controller, useFormContext, useWatch } from 'react-hook-form';

import { FormTextField } from '@/components/common/Input';

import {
  type BannerFormValues,
  CUSTOM_PATH,
  LINK_CHOICES,
  type LinkChoice,
} from '../schemas/bannerSchema';
import type { ContentPageOption } from '../types/banner.types';
import { INTERNAL_ROUTE_OPTIONS } from '../utils/bannerOptions';

const LINK_LABELS: Record<LinkChoice, string> = {
  internal: 'Internal link',
  external: 'External link',
  none: 'No link',
};

interface BannerLinkFieldsProps {
  /** Published content pages offered as `/pages/{slug}`; undefined while loading or not permitted. */
  contentPages?: readonly ContentPageOption[];
  /** Why content pages are not listed (loading, no permission, error), shown under the select. */
  contentPagesNote?: string;
  disabled?: boolean;
}

/** Link type radios and the matching input: an app page picker or an https URL. */
export function BannerLinkFields({
  contentPages,
  contentPagesNote,
  disabled = false,
}: BannerLinkFieldsProps) {
  const { control, clearErrors } = useFormContext<BannerFormValues>();
  const [linkType, internalTarget] = useWatch({
    control,
    name: ['linkType', 'internalTarget'],
  });

  const known = new Set<string>([
    ...INTERNAL_ROUTE_OPTIONS.map((option) => option.value),
    ...(contentPages ?? []).map((page) => `/pages/${page.slug}`),
    CUSTOM_PATH,
    '',
  ]);
  // A saved link that is not in the lists (e.g. /offers/diwali) stays selectable as itself.
  const savedPath = known.has(internalTarget) ? null : internalTarget;

  return (
    <div className="flex flex-col gap-4">
      <Controller
        name="linkType"
        control={control}
        render={({ field }) => (
          <fieldset>
            <Typography component="legend" variant="body2" fontWeight={600}>
              Link type
            </Typography>
            <RadioGroup
              row
              {...field}
              onChange={(event) => {
                const value = LINK_CHOICES.find((choice) => choice === event.target.value);
                if (value) {
                  field.onChange(value);
                  clearErrors(['internalTarget', 'internalPath', 'externalUrl']);
                }
              }}
            >
              {LINK_CHOICES.map((choice) => (
                <FormControlLabel
                  key={choice}
                  value={choice}
                  control={<Radio size="small" />}
                  label={LINK_LABELS[choice]}
                  disabled={disabled}
                />
              ))}
            </RadioGroup>
          </fieldset>
        )}
      />

      {linkType === 'internal' && (
        <>
          <FormTextField
            name="internalTarget"
            control={control}
            select
            required
            fullWidth
            label="Select page"
            disabled={disabled}
            helperText={contentPagesNote ?? 'The app or website screen that opens on tap.'}
            slotProps={{
              select: { MenuProps: { slotProps: { paper: { sx: { maxHeight: 360 } } } } },
            }}
          >
            <MenuItem value="" disabled>
              Select page
            </MenuItem>
            {savedPath && <MenuItem value={savedPath}>{savedPath}</MenuItem>}
            <ListSubheader>App screens</ListSubheader>
            {INTERNAL_ROUTE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
            {contentPages && contentPages.length > 0 && (
              <ListSubheader>Content pages</ListSubheader>
            )}
            {(contentPages ?? []).map((page) => (
              <MenuItem key={page.id} value={`/pages/${page.slug}`}>
                {page.heading}
              </MenuItem>
            ))}
            <ListSubheader>Other</ListSubheader>
            <MenuItem value={CUSTOM_PATH}>Custom path…</MenuItem>
          </FormTextField>
          {internalTarget === CUSTOM_PATH && (
            <FormTextField
              name="internalPath"
              control={control}
              required
              fullWidth
              label="App path"
              placeholder="/offers/diwali"
              disabled={disabled}
              helperText="A path inside Properties, Projects, Offers, Blogs, Pages, FAQs or Subscription plans, e.g. /properties/42."
              slotProps={{ htmlInput: { maxLength: 2048, spellCheck: false } }}
            />
          )}
        </>
      )}

      {linkType === 'external' && (
        <FormTextField
          name="externalUrl"
          control={control}
          required
          fullWidth
          type="url"
          label="External URL"
          placeholder="https://example.com/offer"
          disabled={disabled}
          helperText="https:// only. The app decides whether it opens in the browser or in-app."
          slotProps={{ htmlInput: { maxLength: 2048, spellCheck: false } }}
        />
      )}
    </div>
  );
}
