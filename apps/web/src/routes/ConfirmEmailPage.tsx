import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { useConfirmEmailChange } from '@/api/queries';
import { ChangeEmailStatus } from '@/components/ChangeEmailStatus';
import { DocumentTitle } from '@/components/DocumentTitle';
import { PageTitle } from '@/components/PageTitle';

export function ConfirmEmailPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const confirm = useConfirmEmailChange(token);
  const state = confirm.isSuccess
    ? 'success'
    : token === '' || confirm.isError
      ? 'failure'
      : 'pending';

  return (
    <div className="flex flex-col gap-6">
      <DocumentTitle page={t('account.confirmEmail.title')} />
      <PageTitle>{t('account.confirmEmail.title')}</PageTitle>
      <ChangeEmailStatus state={state} />
    </div>
  );
}
