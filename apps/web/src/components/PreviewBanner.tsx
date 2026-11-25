import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

/** Sits above the real Quiz screen while an Author previews a draft. */
export function PreviewBanner({ editTo }: { editTo: string }) {
  const { t } = useTranslation();
  return (
    <output className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-secondary p-3 text-sm">
      <span>{t('author.preview.banner')}</span>
      <Button asChild size="sm" variant="outline">
        <Link to={editTo}>{t('author.preview.edit')}</Link>
      </Button>
    </output>
  );
}
