import ExpandMore from '@mui/icons-material/ExpandMore';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Typography from '@mui/material/Typography';

import { FormSection } from '@/components/common/FormSection';
import { RichTextContent } from '@/components/common/RichText';

import { FAQ_RICH_TEXT_FEATURES } from '../../utils/faqDisplay';

interface FaqPreviewCardProps {
  question: string;
  /** Answer HTML from the editor. */
  answer: string;
  categoryLabel: string | null;
}

/** How the FAQ reads as an accordion item on the website, updated while typing. */
export function FaqPreviewCard({ question, answer, categoryLabel }: FaqPreviewCardProps) {
  return (
    <FormSection
      title="Preview"
      icon={<VisibilityOutlined fontSize="small" />}
      description={categoryLabel ? `Shown under “${categoryLabel}”.` : undefined}
    >
      <Accordion defaultExpanded disableGutters variant="outlined" className="rounded-lg">
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="body2" fontWeight={600} className="break-words">
            {question.trim() || 'Your question appears here'}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {answer ? (
            <RichTextContent
              html={answer}
              label="Answer preview"
              features={FAQ_RICH_TEXT_FEATURES}
              className="text-sm"
            />
          ) : (
            <Typography variant="body2" color="text.secondary">
              The answer appears here.
            </Typography>
          )}
        </AccordionDetails>
      </Accordion>
    </FormSection>
  );
}
