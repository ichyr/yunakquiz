import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useMe } from '@/api/queries';
import { AuthorAccessNotice } from '@/components/AuthorAccessNotice';
import { DocumentTitle } from '@/components/DocumentTitle';
import { LoadingState } from '@/components/LoadingState';

// The Author screens are fetched only after the guard saw a verified Account, so Guests never
// download them (ADR 0004). A router `lazy` route would load the chunk before the guard runs.
const authorPages = {
  list: lazy(() => import('./AuthorQuizzesPage.tsx')),
  editor: lazy(() => import('./AuthorEditorPage.tsx')),
  preview: lazy(() => import('./AuthorPreviewPage.tsx')),
};

/** The route guard for the Author screens. The API is what really refuses; this keeps the chunk away. */
export function AuthorGate({ page }: { page: keyof typeof authorPages }) {
  const { t } = useTranslation();
  const me = useMe();

  if (me.isPending) return <LoadingState />;
  // `data` survives a failed refetch, so an expired session never unmounts the editor and its text.
  const account = me.data;
  if (!account || !account.verified) {
    const title = account ? t('author.access.unverifiedTitle') : t('author.access.guestTitle');
    return (
      <>
        <DocumentTitle page={title} />
        <AuthorAccessNotice reason={account ? 'unverified' : 'guest'} />
      </>
    );
  }
  const Page = authorPages[page];
  return (
    <Suspense fallback={<LoadingState />}>
      <Page />
    </Suspense>
  );
}
