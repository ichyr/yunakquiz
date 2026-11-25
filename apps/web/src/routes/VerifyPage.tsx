import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { useVerifyEmail } from '@/api/queries';
import { DocumentTitle } from '@/components/DocumentTitle';
import { PageTitle } from '@/components/PageTitle';
import { VerifyStatus } from '@/components/VerifyStatus';

export function VerifyPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const verify = useVerifyEmail(token);
  const state = verify.isSuccess
    ? 'success'
    : token === '' || verify.isError
      ? 'failure'
      : 'pending';

  return (
    <div className="flex flex-col gap-6">
      <DocumentTitle page={t('auth.verify.title')} />
      <PageTitle>{t('auth.verify.title')}</PageTitle>
      <VerifyStatus state={state} />
    </div>
  );
}
