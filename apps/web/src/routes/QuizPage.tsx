import { DocumentTitle } from '@/components/DocumentTitle';
import type { Quiz } from '@yunakquiz/core';
import { useEffect, useRef } from 'react';
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
  const { attempt, inProgress, choose, finish, tryAgain } = useAttempt(quiz);
  const blocker = useLeaveGuard(inProgress);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const scoreRef = useRef<HTMLHeadingElement>(null);
  // Set by Finish and Try again only, so the first load never moves focus.
  const focusAfterPhaseChange = useRef(false);

  useEffect(() => {
    if (!focusAfterPhaseChange.current) return;
    focusAfterPhaseChange.current = false;
    const target = attempt.phase === 'reviewed' ? scoreRef.current : titleRef.current;
    target?.focus({ preventScroll: true });
  }, [attempt.phase]);

  const moveToTop = () => {
    focusAfterPhaseChange.current = true;
    window.scrollTo({ top: 0 });
  };

  return (
    <>
      <DocumentTitle page={quiz.title} />
      {attempt.phase === 'reviewed' ? (
        <ReviewView
          attempt={attempt}
          scoreRef={scoreRef}
          onTryAgain={() => {
            tryAgain();
            moveToTop();
          }}
        />
      ) : (
        <AttemptView
          attempt={attempt}
          titleRef={titleRef}
          onChoose={choose}
          onFinish={() => {
            finish();
            moveToTop();
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
