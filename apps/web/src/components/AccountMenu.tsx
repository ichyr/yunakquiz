import type { Account } from '@yunakquiz/core';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

interface AccountMenuProps {
  /** The signed-in Account, or null for a Guest. */
  account: Account | null;
  onLogout: () => void;
}

/** Login and Register links for a Guest; the display name and Log out for an Account. */
export function AccountMenu({ account, onLogout }: AccountMenuProps) {
  const { t } = useTranslation();

  if (!account) {
    return (
      <div className="flex items-center gap-1">
        <Button asChild size="sm" variant="ghost">
          <Link to="/login">{t('auth.login')}</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/register">{t('auth.register')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button asChild size="sm" variant="ghost" className="max-w-32">
        <Link
          to="/account"
          title={t('auth.session.signedInAs', { name: account.displayName })}
          aria-label={`${t('account.title')}: ${account.displayName}`}
        >
          <span className="truncate">{account.displayName}</span>
        </Link>
      </Button>
      <Button asChild size="sm" variant="ghost">
        <Link to="/author/quizzes">{t('author.nav')}</Link>
      </Button>
      {account.role === 'admin' && account.verified && (
        <Button asChild size="sm" variant="ghost">
          <Link to="/admin/users">{t('admin.nav')}</Link>
        </Button>
      )}
      <Button size="sm" variant="ghost" onClick={onLogout}>
        {t('auth.logout')}
      </Button>
    </div>
  );
}
