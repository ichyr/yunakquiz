import { validateForPublish } from '@yunakquiz/core';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { useAuthoringCategories, useAuthoringQuiz } from '@/api/authoring';
import { DocumentTitle } from '@/components/DocumentTitle';
import { PageMessage } from '@/components/PageMessage';
import { PreviewBanner } from '@/components/PreviewBanner';
import { QueryFallback } from '@/components/QueryFallback';
import { QuizAttempt } from '@/components/QuizAttempt';
import { Button } from '@/components/ui/button';

/** A draft on the real Quiz screen. Its own chunk, behind AuthorGate (ADR 0004). */
export default function AuthorPreviewPage() {
  const { t } = useTranslation();
  const { slug = '' } = useParams();
  const quiz = useAuthoringQuiz(slug);
  const categories = useAuthoringCategories();
  const editTo = `/author/quizzes/${encodeURIComponent(slug)}`;

  if (!quiz.data || !categories.data) {
    return (
      <QueryFallback
        query={quiz.data ? categories : quiz}
        notFoundTitle={t('author.editor.errors.notFound')}
      />
    );
  }

  const names = new Map(categories.data.map((category) => [category.slug, category.name]));
  const checked = validateForPublish(quiz.data, names);
  if (!checked.ok) {
    return (
      <>
        <DocumentTitle page={t('author.preview.invalidTitle')} />
        <PageMessage
          role="alert"
          title={t('author.preview.invalidTitle')}
          description={t('author.preview.invalidDescription')}
          action={
            <Button asChild variant="outline">
              <Link to={editTo}>{t('author.preview.edit')}</Link>
            </Button>
          }
        />
      </>
    );
  }
  return (
    <>
      <PreviewBanner editTo={editTo} />
      <QuizAttempt
        key={`${slug}-${quiz.data.version}`}
        quiz={{ ...checked.quiz, author: quiz.data.author }}
      />
    </>
  );
}
