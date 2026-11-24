import { DocumentTitle } from './DocumentTitle.tsx';
import { LoaderCircleIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function LoadingState() {
  const { t } = useTranslation();

  return (
    <output className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
      <DocumentTitle />
      <LoaderCircleIcon aria-hidden className="size-5 animate-spin motion-reduce:animate-none" />
      {t('status.loading')}
    </output>
  );
}
