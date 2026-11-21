import SaveOutlined from '@mui/icons-material/SaveOutlined';
import TaskAltOutlined from '@mui/icons-material/TaskAltOutlined';

import { Button } from '@/components/common/Button';

/** `draft` saves as a draft; `save` saves with the status chosen in the form. */
export type FaqSaveIntent = 'draft' | 'save';

interface FaqEditorActionsProps {
  /** Show "Save as draft" (hidden when it would need a status change the user may not make). */
  showDraft: boolean;
  /** Label of the main save button. */
  saveLabel: string;
  /** The intent currently being saved, for its spinner. */
  saving: FaqSaveIntent | null;
  onCancel: () => void;
  onSave: (intent: FaqSaveIntent) => void;
}

/** Cancel, save as draft and save buttons of the FAQ form. */
export function FaqEditorActions({
  showDraft,
  saveLabel,
  saving,
  onCancel,
  onSave,
}: FaqEditorActionsProps) {
  const busy = saving !== null;
  return (
    <div className="flex flex-wrap gap-2 self-end sm:self-auto">
      <Button variant="outlined" size="large" onClick={onCancel} disabled={busy}>
        Cancel
      </Button>
      {showDraft && (
        <Button
          variant="outlined"
          size="large"
          startIcon={<SaveOutlined />}
          loading={saving === 'draft'}
          disabled={busy && saving !== 'draft'}
          onClick={() => onSave('draft')}
        >
          Save as draft
        </Button>
      )}
      <Button
        size="large"
        startIcon={<TaskAltOutlined />}
        loading={saving === 'save'}
        disabled={busy && saving !== 'save'}
        onClick={() => onSave('save')}
      >
        {saveLabel}
      </Button>
    </div>
  );
}
