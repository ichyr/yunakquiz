import { AUTHORING_PAGE_SIZE } from '@yunakquiz/core';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { useMyQuizzes } from '@/api/authoring';
import { useMe } from '@/api/queries';
import { AuthorQuizList } from '@/components/AuthorQuizList';
import { DocumentTitle } from '@/components/DocumentTitle';
import { QueryFallback } from '@/components/QueryFallback';
import { PageTitle } from '@/components/PageTitle';
import { Button } from '@/components/ui/button';

/** "My Quizzes": the Author's drafts and published Quizzes. Its own chunk, behind AuthorGate (ADR 0004). */
export default function AuthorQuizzesPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const quizzes = useMyQuizzes(page);
  const me = useMe();
  const pages = quizzes.data ? Math.ceil(quizzes.data.total / AUTHORING_PAGE_SIZE) : 1;

  return (
    <div className="flex flex-col gap-6">
      <DocumentTitle page={t('author.list.title')} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle>{t('author.list.title')}</PageTitle>
        <Button asChild>
          <Link to="/author/quizzes/new">{t('author.list.create')}</Link>
        </Button>
      </div>
      {quizzes.data ? (
        <AuthorQuizList
          quizzes={quizzes.data.items}
          total={quizzes.data.total}
          showAuthor={me.data?.role === 'admin'}
        />
      ) : (
        <QueryFallback query={quizzes} />
      )}
      {pages > 1 && (
        <nav className="flex gap-2" aria-label={t('admin.pagination.label')}>
          {page > 1 && (
            <Button asChild variant="outline">
              <Link to={`?page=${page - 1}`}>{t('admin.pagination.previous')}</Link>
            </Button>
          )}
          {page < pages && (
            <Button asChild variant="outline">
              <Link to={`?page=${page + 1}`}>{t('admin.pagination.next')}</Link>
            </Button>
          )}
        </nav>
      )}
    </div>
  );
}
