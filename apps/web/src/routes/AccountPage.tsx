import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import {
  useChangeDisplayName,
  useChangeEmail,
  useChangePassword,
  useDeleteAccount,
  useMe,
} from '@/api/queries';
import { ChangeEmailForm } from '@/components/ChangeEmailForm';
import { ChangePasswordForm } from '@/components/ChangePasswordForm';
import { DeleteAccountSection } from '@/components/DeleteAccountSection';
import { DisplayNameForm } from '@/components/DisplayNameForm';
import { DocumentTitle } from '@/components/DocumentTitle';
import { PageMessage } from '@/components/PageMessage';
import { PageTitle } from '@/components/PageTitle';
import { QueryFallback } from '@/components/QueryFallback';
import { Button } from '@/components/ui/button';

export function AccountPage() {
  const { t } = useTranslation();
  const me = useMe();
  const navigate = useNavigate();
  const changeName = useChangeDisplayName();
  const changePassword = useChangePassword();
  const changeEmail = useChangeEmail();
  const deleteAccount = useDeleteAccount();
  const account = me.data;

  return (
    <div className="flex flex-col gap-8">
      <DocumentTitle page={t('account.title')} />
      <PageTitle>{t('account.title')}</PageTitle>
      {!account ? (
        me.isPending ? (
          <QueryFallback query={me} />
        ) : (
          <PageMessage
            title={t('account.needLogin')}
            action={
              <Button asChild>
                <Link to="/login">{t('auth.login')}</Link>
              </Button>
            }
          />
        )
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{t('account.displayName.title')}</h2>
            <DisplayNameForm
              currentName={account.displayName}
              onSubmit={async (input) => {
                await changeName.mutateAsync(input);
              }}
            />
          </section>
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{t('account.password.title')}</h2>
            <ChangePasswordForm
              email={account.email}
              displayName={account.displayName}
              onSubmit={changePassword.mutateAsync}
            />
          </section>
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{t('account.email.title')}</h2>
            <ChangeEmailForm currentEmail={account.email} onSubmit={changeEmail.mutateAsync} />
          </section>
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{t('account.delete.title')}</h2>
            <DeleteAccountSection
              onDelete={async (input) => {
                await deleteAccount.mutateAsync(input);
                await navigate('/');
              }}
            />
          </section>
        </>
      )}
    </div>
  );
}
