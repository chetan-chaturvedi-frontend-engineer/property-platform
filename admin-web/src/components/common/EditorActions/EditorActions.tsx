import SaveOutlined from '@mui/icons-material/SaveOutlined';
import TaskAltOutlined from '@mui/icons-material/TaskAltOutlined';

import { Button } from '@/components/common/Button';

/** `draft` saves as a draft; `save` saves with the status chosen in the form. */
export type SaveIntent = 'draft' | 'save';

interface EditorActionsProps {
  /** Show "Save as draft" (hidden when it would need a status change the user may not make). */
  showDraft: boolean;
  /** Label of the main save button. */
  saveLabel: string;
  /** The intent currently being saved, for its spinner. */
  saving: SaveIntent | null;
  onCancel: () => void;
  onSave: (intent: SaveIntent) => void;
}

/** Cancel, save as draft and save buttons in the header of an editor page. */
export function EditorActions({
  showDraft,
  saveLabel,
  saving,
  onCancel,
  onSave,
}: EditorActionsProps) {
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
