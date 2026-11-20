import CheckCircle from '@mui/icons-material/CheckCircle';
import RadioButtonUnchecked from '@mui/icons-material/RadioButtonUnchecked';
import RuleOutlined from '@mui/icons-material/RuleOutlined';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';

import { FormSection } from '@/components/common/FormSection';

export interface ReadinessItem {
  key: string;
  label: string;
  done: boolean;
  /** Required to save or publish (vs. recommended). */
  required?: boolean;
}

interface BlogReadinessCardProps {
  items: readonly ReadinessItem[];
}

/** What is still missing before publishing, required items first. */
export function BlogReadinessCard({ items }: BlogReadinessCardProps) {
  const done = items.filter((item) => item.done).length;
  return (
    <FormSection
      title="Publishing checklist"
      icon={<RuleOutlined fontSize="small" />}
      description={`${done} of ${items.length} done`}
    >
      <LinearProgress
        variant="determinate"
        value={(done / Math.max(1, items.length)) * 100}
        aria-label="Checklist progress"
      />
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-2">
            {item.done ? (
              <CheckCircle fontSize="small" color="success" aria-hidden />
            ) : (
              <RadioButtonUnchecked fontSize="small" color="disabled" aria-hidden />
            )}
            <Typography variant="body2" className="flex-1">
              {item.label}
              <span className="sr-only">{item.done ? ' (done)' : ' (to do)'}</span>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {item.required ? 'Required' : 'Recommended'}
            </Typography>
          </li>
        ))}
      </ul>
    </FormSection>
  );
}
