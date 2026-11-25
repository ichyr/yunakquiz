import type { QuizView } from '@yunakquiz/core';
import { useEffect, useRef } from 'react';
import { useAttempt } from '@/quiz/useAttempt';
import { useLeaveGuard } from '@/quiz/useLeaveGuard';
import { AttemptView } from './AttemptView.tsx';
import { DocumentTitle } from './DocumentTitle.tsx';
import { LeaveAttemptDialog } from './LeaveAttemptDialog.tsx';
import { ReviewView } from './ReviewView.tsx';

/** The Attempt, then its Review at the same address. */
export function QuizAttempt({ quiz }: { quiz: QuizView }) {
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
            if (tryAgain()) moveToTop();
          }}
        />
      ) : (
        <AttemptView
          attempt={attempt}
          author={quiz.author}
          titleRef={titleRef}
          onChoose={choose}
          onFinish={() => {
            if (finish()) moveToTop();
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
