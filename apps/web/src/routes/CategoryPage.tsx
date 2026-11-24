import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { useCategory } from '@/api/queries';
import { PageMessage } from '@/components/PageMessage';
import { PageTitle } from '@/components/PageTitle';
import { QuizList } from '@/components/QuizList';
import { QueryFallback } from '@/components/QueryFallback';

export function CategoryPage() {
  const { t } = useTranslation();
  const { slug = '' } = useParams();
  const category = useCategory(slug);

  if (!category.data) {
    return <QueryFallback query={category} notFoundTitle={t('status.categoryNotFound')} />;
  }

  const { category: info, quizzes } = category.data;
  return (
    <div className="flex flex-col gap-6">
      <PageTitle>{info.name}</PageTitle>
      {quizzes.length === 0 ? (
        <PageMessage title={t('category.noQuizzes')} />
      ) : (
        <QuizList quizzes={quizzes} />
      )}
    </div>
  );
}
