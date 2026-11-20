import PublishOutlined from '@mui/icons-material/PublishOutlined';
import SaveOutlined from '@mui/icons-material/SaveOutlined';
import ScheduleOutlined from '@mui/icons-material/ScheduleOutlined';

import { Button } from '@/components/common/Button';

import type { SaveIntent } from '../../schemas/blogSchema';

interface BlogEditorActionsProps {
  /** What the publish button does: publish now, schedule, or update an already published blog. */
  publishKind: 'publish' | 'schedule' | 'update';
  /** The saved blog is published, so "draft" unpublishes it. */
  isPublished: boolean;
  /** The intent currently being saved, for its spinner. */
  saving: SaveIntent | null;
  onCancel: () => void;
  onSave: (intent: SaveIntent) => void;
}

const PUBLISH_LABELS = {
  publish: 'Publish blog',
  schedule: 'Schedule blog',
  update: 'Update blog',
};

/** Cancel, save as draft (or unpublish) and publish buttons of the blog editor. */
export function BlogEditorActions({
  publishKind,
  isPublished,
  saving,
  onCancel,
  onSave,
}: BlogEditorActionsProps) {
  const busy = saving !== null;
  return (
    <div className="flex flex-wrap gap-2 self-end sm:self-auto">
      <Button variant="outlined" size="large" onClick={onCancel} disabled={busy}>
        Cancel
      </Button>
      <Button
        variant="outlined"
        size="large"
        startIcon={<SaveOutlined />}
        loading={saving === 'draft'}
        disabled={busy && saving !== 'draft'}
        onClick={() => onSave('draft')}
      >
        {isPublished ? 'Unpublish & save draft' : 'Save as draft'}
      </Button>
      <Button
        size="large"
        startIcon={publishKind === 'schedule' ? <ScheduleOutlined /> : <PublishOutlined />}
        loading={saving === 'publish'}
        disabled={busy && saving !== 'publish'}
        onClick={() => onSave('publish')}
      >
        {PUBLISH_LABELS[publishKind]}
      </Button>
    </div>
  );
}
