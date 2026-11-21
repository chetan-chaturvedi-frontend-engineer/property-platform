import Typography from '@mui/material/Typography';

import { RichTextContent } from '@/components/common/RichText';

interface ContentPageArticleProps {
  heading: string;
  subHeading?: string | null;
  /** Page HTML (sanitized when it comes from the API; editor output in the live preview). */
  content: string;
}

/** The page as visitors read it: heading, sub heading and content. Text is escaped by React. */
export function ContentPageArticle({ heading, subHeading, content }: ContentPageArticleProps) {
  return (
    <article className="flex min-w-0 flex-col gap-3">
      <header className="flex flex-col gap-1 border-b pb-3">
        <Typography variant="h5" component="h2" fontWeight={700} className="break-words">
          {heading.trim() || 'Untitled page'}
        </Typography>
        {subHeading?.trim() && (
          <Typography variant="subtitle1" color="text.secondary" className="break-words">
            {subHeading}
          </Typography>
        )}
      </header>
      {content ? (
        <RichTextContent html={content} label="Page content" />
      ) : (
        <Typography variant="body2" color="text.secondary">
          The page content appears here.
        </Typography>
      )}
    </article>
  );
}
