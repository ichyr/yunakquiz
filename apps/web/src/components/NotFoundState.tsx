import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { PageMessage } from './PageMessage.tsx';

/** A broken or outdated link: says what is missing and leads Home. */
export function NotFoundState({ title }: { title: string }) {
  const { t } = useTranslation();
  return (
    <PageMessage
      role="alert"
      title={title}
      description={t('status.notFoundDescription')}
      action={
        <Button asChild variant="outline">
          <Link to="/">{t('status.goHome')}</Link>
        </Button>
      }
    />
  );
}
