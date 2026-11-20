import FilterAltOutlined from '@mui/icons-material/FilterAltOutlined';
import RestartAlt from '@mui/icons-material/RestartAlt';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { Button } from '@/components/common/Button';
import { DateRangeFields } from '@/components/common/DateRangeFields';

import { normalizeTag } from '../utils/blogSlug';
import { type BlogPanelFilters, EMPTY_BLOG_PANEL } from '../utils/blogFilters';

interface BlogFiltersPanelProps {
  /** The filters currently applied; the panel edits a draft copy. Remount (key) to reset it. */
  applied: BlogPanelFilters;
  /** Known tags offered as suggestions. */
  tagOptions: readonly string[];
  onApply: (filters: BlogPanelFilters) => void;
  onReset: () => void;
}

export function BlogFiltersPanel({ applied, tagOptions, onApply, onReset }: BlogFiltersPanelProps) {
  const [draft, setDraft] = useState(applied);
  const set = <K extends keyof BlogPanelFilters>(key: K, value: BlogPanelFilters[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const tagValid = draft.tag === '' || normalizeTag(draft.tag) !== null;
  const invalid =
    !tagValid ||
    (draft.publishedFrom !== '' &&
      draft.publishedTo !== '' &&
      draft.publishedTo < draft.publishedFrom) ||
    (draft.createdFrom !== '' && draft.createdTo !== '' && draft.createdTo < draft.createdFrom);

  return (
    <section aria-label="Blog filters" className="flex flex-col gap-4">
      <Typography variant="subtitle1" component="h2" fontWeight={700}>
        Filters
      </Typography>
      <Autocomplete
        freeSolo
        options={tagOptions}
        value={draft.tag}
        inputValue={draft.tag}
        onInputChange={(_, value) => set('tag', value)}
        renderInput={(params) => (
          <TextField
            {...params}
            size="small"
            label="Tag"
            placeholder="e.g. home loans"
            error={!tagValid}
            helperText={
              tagValid ? 'Blogs with this tag' : 'Letters, digits, spaces and . _ & + # -'
            }
          />
        )}
      />
      <DateRangeFields
        legend="Published between"
        from={draft.publishedFrom}
        to={draft.publishedTo}
        onFromChange={(value) => set('publishedFrom', value)}
        onToChange={(value) => set('publishedTo', value)}
      />
      <DateRangeFields
        legend="Created between"
        from={draft.createdFrom}
        to={draft.createdTo}
        onFromChange={(value) => set('createdFrom', value)}
        onToChange={(value) => set('createdTo', value)}
      />
      <Typography variant="caption" color="text.secondary">
        The published date filter only matches blogs that have a publication date; drafts that were
        never published are left out.
      </Typography>
      <Button
        startIcon={<FilterAltOutlined />}
        onClick={() => onApply({ ...draft, tag: normalizeTag(draft.tag) ?? '' })}
        disabled={invalid}
        fullWidth
      >
        Apply filters
      </Button>
      <Button
        variant="text"
        startIcon={<RestartAlt />}
        onClick={() => {
          setDraft(EMPTY_BLOG_PANEL);
          onReset();
        }}
        fullWidth
      >
        Reset filters
      </Button>
    </section>
  );
}
