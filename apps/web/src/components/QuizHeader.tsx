import type { QuizSummary } from '@yunakquiz/core';
import type { Ref } from 'react';
import { PageTitle } from './PageTitle.tsx';
import { QuizLanguageBadge } from './QuizLanguageBadge.tsx';

interface QuizHeaderProps {
  quiz: QuizSummary;
  /** Lets the page move focus to the title, for example after Try again. */
  titleRef?: Ref<HTMLHeadingElement> | undefined;
}

export function QuizHeader({ quiz, titleRef }: QuizHeaderProps) {
  return (
    <header className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <PageTitle ref={titleRef} lang={quiz.language} tabIndex={-1}>
          {quiz.title}
        </PageTitle>
        <QuizLanguageBadge language={quiz.language} />
      </div>
      <p lang={quiz.language} className="text-muted-foreground">
        {quiz.description}
      </p>
    </header>
  );
}
