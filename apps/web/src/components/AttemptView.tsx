import { answeredCount, canFinish, type AnsweringAttempt } from '@yunakquiz/core';
import type { Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { QuestionField } from './QuestionField.tsx';
import { QuizHeader } from './QuizHeader.tsx';

interface AttemptViewProps {
  attempt: AnsweringAttempt;
  /** The Quiz's Author, shown under the title. */
  author?: { displayName: string } | null | undefined;
  onChoose: (questionId: number, optionId: number) => void;
  onFinish: () => void;
  titleRef?: Ref<HTMLHeadingElement> | undefined;
}

/** All Questions on one page, no feedback until Finish. */
export function AttemptView({ attempt, author, onChoose, onFinish, titleRef }: AttemptViewProps) {
  const { t } = useTranslation();
  const { quiz, questions } = attempt;
  const total = questions.length;
  const ready = canFinish(attempt);

  return (
    <div className="flex flex-col gap-6">
      <QuizHeader quiz={quiz} author={author} titleRef={titleRef} />

      <ol className="flex flex-col gap-4">
        {questions.map((question, index) => (
          <li key={question.id}>
            <QuestionField
              question={question}
              number={index + 1}
              total={total}
              language={quiz.language}
              chosenOptionId={attempt.chosenOptions[question.id]}
              onChoose={(optionId) => onChoose(question.id, optionId)}
            />
          </li>
        ))}
      </ol>

      <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-4 border-t bg-background/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
        <div className="flex flex-col text-sm">
          <p aria-live="polite" className="font-medium tabular-nums">
            {t('attempt.progress', { answered: answeredCount(attempt), total })}
          </p>
          {!ready && (
            <p id="finish-hint" className="text-xs text-muted-foreground">
              {t('attempt.finishHint')}
            </p>
          )}
        </div>
        <Button
          size="lg"
          aria-disabled={!ready}
          aria-describedby={ready ? undefined : 'finish-hint'}
          onClick={() => {
            if (ready) onFinish();
          }}
        >
          {t('attempt.finish')}
        </Button>
      </div>
    </div>
  );
}
