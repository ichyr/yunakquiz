import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { PageMessage } from '@/components/PageMessage';
import { Button } from '@/components/ui/button';

interface ChangeEmailStatusProps {
  state: 'pending' | 'success' | 'failure';
}

/** The outcome of opening the mailed link that confirms a new email address. */
export function ChangeEmailStatus({ state }: ChangeEmailStatusProps) {
  const { t } = useTranslation();

  if (state === 'pending') return <PageMessage title={t('account.confirmEmail.pending')} />;
  if (state === 'failure') {
    return (
      <PageMessage
        role="alert"
        title={t('account.confirmEmail.failure')}
        action={
          <Button asChild variant="outline">
            <Link to="/account">{t('account.title')}</Link>
          </Button>
        }
      />
    );
  }
  return (
    <PageMessage
      title={t('account.confirmEmail.success')}
      action={
        <Button asChild>
          <Link to="/account">{t('account.title')}</Link>
        </Button>
      }
    />
  );
}
