import type { QuizSummary } from '@yunakquiz/core';
import { Link } from 'react-router';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QuizLanguageBadge } from './QuizLanguageBadge.tsx';

export function QuizList({ quizzes }: { quizzes: QuizSummary[] }) {
  return (
    <ul className="grid gap-3">
      {quizzes.map((quiz) => (
        <li key={quiz.slug}>
          <Link to={`/quizzes/${quiz.slug}`} className="focus-ring block rounded-xl">
            <Card className="gap-0 py-4 transition-colors hover:bg-accent/50">
              <CardHeader className="gap-2 px-4">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle lang={quiz.language} className="text-base leading-snug">
                    {quiz.title}
                  </CardTitle>
                  <QuizLanguageBadge language={quiz.language} />
                </div>
                <CardDescription lang={quiz.language}>{quiz.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
