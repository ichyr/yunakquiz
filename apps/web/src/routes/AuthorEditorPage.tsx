import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import { checkSlug, useAuthoringActions, useAuthoringQuiz } from '@/api/authoring';
import { useCategories, useLogin, useMe } from '@/api/queries';
import { DocumentTitle } from '@/components/DocumentTitle';
import { PageTitle } from '@/components/PageTitle';
import { QueryFallback } from '@/components/QueryFallback';
import { QuizEditorForm } from '@/components/QuizEditorForm';

/** Create or edit one Quiz. Its own chunk, behind AuthorGate (ADR 0004). */
export default function AuthorEditorPage() {
  const { t, i18n } = useTranslation();
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const me = useMe();
  const categories = useCategories();
  const quiz = useAuthoringQuiz(slug);
  const actions = useAuthoringActions();
  const login = useLogin();
  // Bumped to load the current version into a fresh form after a conflict.
  const [generation, setGeneration] = useState(0);
  const isNew = slug === '';
  const title = isNew ? t('author.editor.createTitle') : t('author.editor.editTitle');

  const ready = categories.data && (isNew || quiz.data);

  return (
    <div className="flex flex-col gap-6">
      <DocumentTitle page={title} />
      <Link to="/author/quizzes" className="text-sm underline underline-offset-4">
        {t('author.editor.actions.backToList')}
      </Link>
      <PageTitle>{title}</PageTitle>
      {ready ? (
        <QuizEditorForm
          key={`${slug}-${generation}`}
          quiz={isNew ? undefined : quiz.data}
          categories={categories.data}
          isAdmin={me.data?.role === 'admin'}
          defaultLanguage={i18n.language.startsWith('en') ? 'en' : 'uk'}
          checkSlug={checkSlug}
          onSave={(draft, target) => actions.save.mutateAsync({ draft, target })}
          onPublish={(savedSlug, version) =>
            actions.publish.mutateAsync({ slug: savedSlug, version })
          }
          onDelete={(savedSlug) => actions.remove.mutateAsync(savedSlug).then(() => undefined)}
          onLogin={async (input) => {
            await login.mutateAsync(input);
          }}
          onSaved={(saved, then) => {
            if (then === 'preview') {
              void navigate(`/author/quizzes/${encodeURIComponent(saved.slug)}/preview`);
            } else if (saved.slug !== slug) {
              void navigate(`/author/quizzes/${encodeURIComponent(saved.slug)}`, { replace: true });
            }
          }}
          onDeleted={() => void navigate('/author/quizzes')}
          onReload={() => void quiz.refetch().then(() => setGeneration((value) => value + 1))}
        />
      ) : (
        <QueryFallback
          query={categories.data || isNew ? quiz : categories}
          notFoundTitle={t('author.editor.errors.notFound')}
        />
      )}
    </div>
  );
}
