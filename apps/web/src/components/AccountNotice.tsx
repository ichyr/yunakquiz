import { useTranslation } from 'react-i18next';

interface AccountNoticeProps {
  /** `unverified`: signed in, email not confirmed. `sessionExpired`: the cookie matches no session. */
  kind: 'unverified' | 'sessionExpired';
}

/** A full-width notice under the header about the state of the Account. */
export function AccountNotice({ kind }: AccountNoticeProps) {
  const { t } = useTranslation();
  const expired = kind === 'sessionExpired';
  return (
    <p
      role={expired ? 'alert' : 'status'}
      className="border-b bg-secondary px-4 py-2 text-center text-sm"
    >
      {expired ? t('auth.session.expired') : t('auth.session.unverified')}
    </p>
  );
}
