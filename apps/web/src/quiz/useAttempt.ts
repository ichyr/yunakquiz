import {
  answeredCount,
  buildReview,
  canFinish,
  chooseOption,
  isInProgress,
  startAttempt,
  type Quiz,
  type Review,
} from '@yunakquiz/core';
import { useState } from 'react';

/** Holds one Attempt and, once finished, its Review. All Quiz logic comes from core. */
export function useAttempt(quiz: Quiz) {
  const [attempt, setAttempt] = useState(() => startAttempt(quiz));
  const [review, setReview] = useState<Review | null>(null);

  return {
    attempt,
    review,
    answeredCount: answeredCount(attempt),
    canFinish: canFinish(attempt),
    /** True while the scout has chosen Options that leaving would discard. */
    inProgress: isInProgress(attempt, review !== null),
    choose(questionId: number, optionId: number) {
      setAttempt((current) => chooseOption(current, questionId, optionId));
    },
    finish() {
      setReview(buildReview(attempt));
    },
    tryAgain() {
      setAttempt(startAttempt(quiz));
      setReview(null);
    },
  };
}
