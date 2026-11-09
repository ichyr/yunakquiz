import { useTranslation } from 'react-i18next';
import { useCategories } from '@/api/queries';
import { CategoryList } from '@/components/CategoryList';
import { PageMessage } from '@/components/PageMessage';
import { SearchForm } from '@/components/SearchForm';
import { QueryFallback } from '@/components/QueryFallback';
import { useSearchNavigation } from './useSearchNavigation.ts';

export function HomePage() {
  const { t } = useTranslation();
  const categories = useCategories();
  const search = useSearchNavigation();

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t('home.title')}</h1>
        <SearchForm onSearch={search} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t('home.categories')}</h2>
        {!categories.data ? (
          <QueryFallback query={categories} />
        ) : categories.data.length === 0 ? (
          <PageMessage title={t('home.noCategories')} />
        ) : (
          <CategoryList categories={categories.data} />
        )}
      </section>
    </div>
  );
}
