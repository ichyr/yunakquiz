import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { PageMessage } from '@/components/PageMessage';
import { Button } from '@/components/ui/button';

interface VerifyStatusProps {
  state: 'pending' | 'success' | 'failure';
}

/** The outcome of opening the mailed verification link. */
export function VerifyStatus({ state }: VerifyStatusProps) {
  const { t } = useTranslation();

  if (state === 'pending') return <PageMessage title={t('auth.verify.pending')} />;
  if (state === 'failure') {
    return (
      <PageMessage
        role="alert"
        title={t('auth.verify.failure')}
        action={
          <Button asChild variant="outline">
            <Link to="/register">{t('auth.register')}</Link>
          </Button>
        }
      />
    );
  }
  return (
    <PageMessage
      title={t('auth.verify.success')}
      action={
        <Button asChild>
          <Link to="/login">{t('auth.login')}</Link>
        </Button>
      }
    />
  );
}
