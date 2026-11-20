import TravelExploreOutlined from '@mui/icons-material/TravelExploreOutlined';
import Typography from '@mui/material/Typography';

import { FormSection } from '@/components/common/FormSection';

import { TagList } from './BlogInfoTable';

interface BlogSeoCardProps {
  metaTitle: string | null;
  metaDescription: string | null;
  /** Public fallbacks the website uses when the meta fields are empty. */
  fallbackTitle: string;
  fallbackDescription: string | null;
  slug: string;
  tags: readonly string[];
}

interface SeoValueProps {
  label: string;
  value: string | null;
  fallback: string | null;
  fallbackName: string;
}

function SeoValue({ label, value, fallback, fallbackName }: SeoValueProps) {
  return (
    <div className="flex flex-col gap-0.5 border-b pb-3">
      <Typography variant="caption" color="text.secondary" fontWeight={600}>
        {label}
      </Typography>
      <Typography variant="body2" className="break-words">
        {value ?? fallback ?? '—'}
      </Typography>
      {!value && fallback && (
        <Typography variant="caption" color="text.secondary">
          Not set: the {fallbackName} is used.
        </Typography>
      )}
    </div>
  );
}

/** Meta title and description as the website will use them (with fallbacks), path and keywords. */
export function BlogSeoCard({
  metaTitle,
  metaDescription,
  fallbackTitle,
  fallbackDescription,
  slug,
  tags,
}: BlogSeoCardProps) {
  return (
    <FormSection title="SEO & meta details" icon={<TravelExploreOutlined fontSize="small" />}>
      <SeoValue
        label="Meta title"
        value={metaTitle}
        fallback={fallbackTitle}
        fallbackName="title"
      />
      <SeoValue
        label="Meta description"
        value={metaDescription}
        fallback={fallbackDescription}
        fallbackName="short description"
      />
      <div className="flex flex-col gap-1 border-b pb-3">
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          Keywords (tags)
        </Typography>
        <TagList tags={tags} />
      </div>
      <div className="flex flex-col gap-0.5">
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          URL path
        </Typography>
        <Typography variant="body2" className="break-all font-mono">
          /blog/{slug}
        </Typography>
      </div>
    </FormSection>
  );
}
