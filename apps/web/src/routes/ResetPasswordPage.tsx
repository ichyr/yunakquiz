import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { useCompletePasswordReset, useRequestPasswordReset } from '@/api/queries';
import { DocumentTitle } from '@/components/DocumentTitle';
import { ForgotPasswordForm } from '@/components/ForgotPasswordForm';
import { PageMessage } from '@/components/PageMessage';
import { PageTitle } from '@/components/PageTitle';
import { ResetPasswordForm } from '@/components/ResetPasswordForm';
import { Button } from '@/components/ui/button';

/** Without `?token=` it asks for the email; the mailed link carries the token and sets the password. */
export function ResetPasswordPage() {
  const { t } = useTranslation();
  const token = useSearchParams()[0].get('token');
  const request = useRequestPasswordReset();
  const complete = useCompletePasswordReset();
  const title = token ? t('passwordReset.completeTitle') : t('passwordReset.requestTitle');

  return (
    <div className="flex flex-col gap-6">
      <DocumentTitle page={title} />
      <PageTitle>{title}</PageTitle>
      {token ? (
        complete.isSuccess ? (
          <PageMessage
            title={t('passwordReset.doneTitle')}
            action={
              <Button asChild>
                <Link to="/login">{t('auth.login')}</Link>
              </Button>
            }
          />
        ) : (
          <ResetPasswordForm onSubmit={(password) => complete.mutateAsync({ token, password })} />
        )
      ) : request.isSuccess ? (
        <PageMessage
          title={t('passwordReset.sentTitle')}
          description={t('passwordReset.sentDescription')}
        />
      ) : (
        <ForgotPasswordForm onSubmit={request.mutateAsync} />
      )}
    </div>
  );
}
