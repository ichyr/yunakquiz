import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { useQuizSearch } from '@/api/queries';
import { PageMessage } from '@/components/PageMessage';
import { QuizList } from '@/components/QuizList';
import { SearchForm } from '@/components/SearchForm';
import { QueryFallback } from './QueryFallback.tsx';
import { useSearchNavigation } from './useSearchNavigation.ts';

export function SearchPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const query = (searchParams.get('q') ?? '').trim();
  const results = useQuizSearch(query);
  const search = useSearchNavigation();

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t('search.title')}</h1>
        {/* Keyed so Back/Forward refills the box with that address's query. */}
        <SearchForm key={query} defaultQuery={query} onSearch={search} />
      </section>

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
