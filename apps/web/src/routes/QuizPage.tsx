import type { Quiz } from '@yunakquiz/core';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { useQuiz } from '@/api/queries';
import { AttemptView } from '@/components/AttemptView';
import { LeaveAttemptDialog } from '@/components/LeaveAttemptDialog';
import { ReviewView } from '@/components/ReviewView';
import { QueryFallback } from '@/components/QueryFallback';
import { useAttempt } from '@/quiz/useAttempt';
import { useLeaveGuard } from '@/quiz/useLeaveGuard';

export function QuizPage() {
  const { t } = useTranslation();
  const { slug = '' } = useParams();
  const quiz = useQuiz(slug);

  // Checked first, so a failed background refetch never throws away an Attempt.
  if (quiz.data) return <QuizAttempt key={slug} quiz={quiz.data} />;
  return <QueryFallback query={quiz} notFoundTitle={t('status.quizNotFound')} />;
}

/** The Attempt, then its Review at the same address. */
function QuizAttempt({ quiz }: { quiz: Quiz }) {
  const attempt = useAttempt(quiz);
  const blocker = useLeaveGuard(attempt.inProgress);

  return (
    <>
      {attempt.attempt.phase === 'reviewed' ? (
        <ReviewView
          attempt={attempt.attempt}
          onTryAgain={() => {
            attempt.tryAgain();
            window.scrollTo({ top: 0 });
          }}
        />
      ) : (
        <AttemptView
          attempt={attempt.attempt}
          onChoose={attempt.choose}
          onFinish={() => {
            attempt.finish();
            window.scrollTo({ top: 0 });
          }}
        />
      )}
      <LeaveAttemptDialog
        open={blocker.state === 'blocked'}
        onStay={() => blocker.reset?.()}
        onLeave={() => blocker.proceed?.()}
      />
    </>
  );
}
