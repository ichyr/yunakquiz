import { DocumentTitle } from '@/components/DocumentTitle';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { useQuizSearch } from '@/api/queries';
import { PageMessage } from '@/components/PageMessage';
import { PageTitle } from '@/components/PageTitle';
import { QuizList } from '@/components/QuizList';
import { SearchForm } from '@/components/SearchForm';
import { QueryFallback } from '@/components/QueryFallback';
import { useSearchNavigation } from './useSearchNavigation.ts';

export function SearchPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const query = (searchParams.get('q') ?? '').trim();
  const results = useQuizSearch(query);
  const search = useSearchNavigation();

  const showsPage = query === '' || results.data !== undefined;
  const resultsText = results.data?.length ? t('search.resultsFor', { query }) : '';

  return (
    <div className="flex flex-col gap-6">
      {/* While loading, offline or failed, QueryFallback's own title is the only one. */}
      {showsPage && <DocumentTitle page={query || t('search.title')} />}
      <section className="flex flex-col gap-3">
        <PageTitle>{t('search.title')}</PageTitle>
        <SearchForm addressQuery={query} onSearch={search} />
      </section>

      <output className="sr-only">{resultsText}</output>

      {query === '' ? (
        <PageMessage title={t('search.blank')} />
      ) : !results.data ? (
        <QueryFallback query={results} />
      ) : (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm text-muted-foreground">{t('search.resultsFor', { query })}</h2>
          {results.data.length === 0 ? (
            <PageMessage title={t('search.noResults')} />
          ) : (
            <QuizList quizzes={results.data} />
          )}
        </section>
      )}
    </div>
  );
}
