import type { Quiz } from '@yunakquiz/core';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { useQuiz } from '@/api/queries';
import { AttemptView } from '@/components/AttemptView';
import { LeaveAttemptDialog } from '@/components/LeaveAttemptDialog';
import { ReviewView } from '@/components/ReviewView';
import { useAttempt } from '@/quiz/useAttempt';
import { useLeaveGuard } from '@/quiz/useLeaveGuard';
import { QueryFallback } from './QueryFallback.tsx';

export function QuizPage() {
  const { t } = useTranslation();
  const { slug = '' } = useParams();
  const quiz = useQuiz(slug);

  // Checked first, so a failed background refetch never throws away an Attempt.
  if (quiz.data) return <QuizSession key={slug} quiz={quiz.data} />;
  return <QueryFallback query={quiz} notFoundTitle={t('status.quizNotFound')} />;
}

/** The Attempt, then its Review at the same address. */
function QuizSession({ quiz }: { quiz: Quiz }) {
  const session = useAttempt(quiz);
  const blocker = useLeaveGuard(session.inProgress);

  return (
    <>
      {session.review ? (
        <ReviewView
          quiz={quiz}
          review={session.review}
          onTryAgain={() => {
            session.tryAgain();
            window.scrollTo({ top: 0 });
          }}
        />
      ) : (
        <AttemptView
          attempt={session.attempt}
          answeredCount={session.answeredCount}
          canFinish={session.canFinish}
          onChoose={session.choose}
          onFinish={() => {
            session.finish();
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
