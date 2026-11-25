import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useMe } from '@/api/queries';
import { DocumentTitle } from '@/components/DocumentTitle';
import { LoadingState } from '@/components/LoadingState';
import { PageMessage } from '@/components/PageMessage';

// The Admin screens are fetched only after the guard saw an Admin, so Guests and Users never
// download them (ADR 0004). A router `lazy` route would load the chunk before the guard runs.
const adminPages = {
  users: lazy(() => import('./AdminUsersPage.tsx')),
  categories: lazy(() => import('./AdminCategoriesPage.tsx')),
};

/** The route guard for the Admin screens. The API is what really refuses; this keeps the chunks away. */
export function AdminGate({ page }: { page: keyof typeof adminPages }) {
  const { t } = useTranslation();
  const me = useMe();

  if (me.isPending) return <LoadingState />;
  const account = me.data;
  if (!account || account.role !== 'admin' || !account.verified) {
    return (
      <>
        <DocumentTitle page={t('admin.forbiddenTitle')} />
        <PageMessage
          role="alert"
          title={t('admin.forbiddenTitle')}
          description={t('admin.forbiddenDescription')}
        />
      </>
    );
  }
  const Page = adminPages[page];
  return (
    <Suspense fallback={<LoadingState />}>
      <Page />
    </Suspense>
  );
}
