import type { AuthoringQuizItem } from '@yunakquiz/core';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { PageMessage } from './PageMessage.tsx';
import { QuizLanguageBadge } from './QuizLanguageBadge.tsx';

interface AuthorQuizListProps {
  quizzes: AuthoringQuizItem[];
  total: number;
  /** Admins see every Quiz, so the list names each Author. */
  showAuthor?: boolean;
}

/** The Author's own drafts and published Quizzes. Each row opens the editor. */
export function AuthorQuizList({ quizzes, total, showAuthor = false }: AuthorQuizListProps) {
  const { t, i18n } = useTranslation();

  if (quizzes.length === 0) {
    return (
      <PageMessage
        title={t('author.list.empty')}
        description={t('author.list.emptyHint')}
        action={
          <Button asChild>
            <Link to="/author/quizzes/new">{t('author.list.create')}</Link>
          </Button>
        }
      />
    );
  }

  const formatDate = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' });

  return (
    <div className="flex flex-col gap-3">
      <ul className="grid gap-3">
        {quizzes.map((quiz) => (
          <li key={quiz.slug}>
            <Link
              to={`/author/quizzes/${encodeURIComponent(quiz.slug)}`}
              className="focus-ring block rounded-xl"
            >
              <Card className="gap-0 py-4 transition-colors hover:bg-accent/50">
                <CardHeader className="gap-2 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle lang={quiz.language || undefined} className="text-base leading-snug">
                      {quiz.title || t('author.list.untitled')}
                    </CardTitle>
                    <Badge variant={quiz.status === 'published' ? 'default' : 'secondary'}>
                      {t(`author.list.status.${quiz.status}`)}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span>
                      {t('author.list.updated', {
                        date: formatDate.format(new Date(quiz.updatedAt)),
                      })}
                    </span>
                    {quiz.language && <QuizLanguageBadge language={quiz.language} />}
                    {showAuthor && (
                      <span>
                        {quiz.author
                          ? t('author.list.by', { name: quiz.author.displayName })
                          : t('author.list.ownerless')}
                      </span>
                    )}
                  </div>
                </CardHeader>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
      {total > quizzes.length && (
        <p className="text-sm text-muted-foreground">
          {t('author.list.pagination', { shown: quizzes.length, total })}
        </p>
      )}
    </div>
  );
}
