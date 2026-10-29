import {
  answer,
  buildReview,
  canFinish,
  startAttempt,
  type Quiz,
  type Review,
} from '@yunakquiz/core';
import { useState } from 'react';

/** Holds one Attempt and, once finished, its Review. All Quiz logic comes from core. */
export function useAttempt(quiz: Quiz) {
  const [attempt, setAttempt] = useState(() => startAttempt(quiz));
  const [review, setReview] = useState<Review | null>(null);

  const answeredCount = Object.keys(attempt.answers).length;

  return {
    attempt,
    review,
    answeredCount,
    canFinish: canFinish(attempt),
    /** True while the scout has answers that leaving would discard. */
    inProgress: review === null && answeredCount > 0,
    choose(questionId: number, optionId: number) {
      setAttempt((current) => answer(current, questionId, optionId));
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
