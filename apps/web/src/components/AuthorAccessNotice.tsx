import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { PageMessage } from './PageMessage.tsx';

interface AuthorAccessNoticeProps {
  /** `guest`: not logged in. `unverified`: logged in, email not confirmed. */
  reason: 'guest' | 'unverified';
}

/** Tells someone who cannot author why, instead of an empty screen. */
export function AuthorAccessNotice({ reason }: AuthorAccessNoticeProps) {
  const { t } = useTranslation();
  if (reason === 'unverified') {
    return (
      <PageMessage
        role="alert"
        title={t('author.access.unverifiedTitle')}
        description={t('author.access.unverifiedDescription')}
      />
    );
  }
  return (
    <PageMessage
      role="alert"
      title={t('author.access.guestTitle')}
      description={t('author.access.guestDescription')}
      action={
        <Button asChild>
          <Link to="/login">{t('author.access.login')}</Link>
        </Button>
      }
    />
  );
}
