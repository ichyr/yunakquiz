import { DocumentTitle } from './DocumentTitle.tsx';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { PageMessage } from './PageMessage.tsx';

/** A failed load that may work on a second try. */
export function LoadErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <>
      <DocumentTitle page={t('status.errorTitle')} />
      <PageMessage
        role="alert"
        title={t('status.errorTitle')}
        description={t('status.errorDescription')}
        action={
          <Button variant="outline" onClick={onRetry}>
            {t('status.retry')}
          </Button>
        }
      />
    </>
  );
}
