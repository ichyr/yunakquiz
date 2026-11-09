import type { Attempt } from '@yunakquiz/core';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { QuestionField } from './QuestionField.tsx';
import { QuizHeader } from './QuizHeader.tsx';

interface AttemptViewProps {
  attempt: Attempt;
  answeredCount: number;
  canFinish: boolean;
  onChoose: (questionId: number, optionId: number) => void;
  onFinish: () => void;
}

/** All Questions on one page, no feedback until Finish. */
export function AttemptView({
  attempt,
  answeredCount,
  canFinish,
  onChoose,
  onFinish,
}: AttemptViewProps) {
  const { t } = useTranslation();
  const { quiz, questions } = attempt;
  const total = questions.length;

  return (
    <div className="flex flex-col gap-6">
      <QuizHeader quiz={quiz} />

      <ol className="flex flex-col gap-4">
        {questions.map((question, index) => (
          <li key={question.id}>
            <QuestionField
              question={question}
              number={index + 1}
              total={total}
              language={quiz.language}
              chosenOptionId={attempt.answers[question.id]}
              onChoose={(optionId) => onChoose(question.id, optionId)}
            />
          </li>
        ))}
      </ol>

      <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-4 border-t bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-col text-sm">
          <p aria-live="polite" className="font-medium tabular-nums">
            {t('attempt.progress', { answered: answeredCount, total })}
          </p>
          {!canFinish && <p className="text-xs text-muted-foreground">{t('attempt.finishHint')}</p>}
        </div>
        <Button size="lg" disabled={!canFinish} onClick={onFinish}>
          {t('attempt.finish')}
        </Button>
      </div>
    </div>
  );
}
