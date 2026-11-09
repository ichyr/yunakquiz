import type { QuizSummary } from '@yunakquiz/core';
import { QuizLanguageBadge } from './QuizLanguageBadge.tsx';

export function QuizHeader({ quiz }: { quiz: QuizSummary }) {
  return (
    <header className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <h1 lang={quiz.language} className="text-2xl font-bold tracking-tight">
          {quiz.title}
        </h1>
        <QuizLanguageBadge language={quiz.language} />
      </div>
      <p lang={quiz.language} className="text-muted-foreground">
        {quiz.description}
      </p>
    </header>
  );
}
