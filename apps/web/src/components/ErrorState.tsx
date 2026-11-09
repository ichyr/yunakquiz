import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { PageMessage } from './PageMessage.tsx';

type ErrorStateProps =
  | { notFound: true; title: string; onRetry?: never }
  | { notFound?: false; title?: never; onRetry: () => void };

/** "Not found" offers the way home; any other failure offers a retry. */
export function ErrorState(props: ErrorStateProps) {
  const { t } = useTranslation();

  if (props.notFound) {
    return (
      <PageMessage
        role="alert"
        title={props.title}
        description={t('status.notFoundDescription')}
        action={
          <Button asChild variant="outline">
            <Link to="/">{t('status.goHome')}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <PageMessage
      role="alert"
      title={t('status.errorTitle')}
      description={t('status.errorDescription')}
      action={
        <Button variant="outline" onClick={props.onRetry}>
          {t('status.retry')}
        </Button>
      }
    />
  );
}
