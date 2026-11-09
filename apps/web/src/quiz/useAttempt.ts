import {
  chooseOption,
  finishAttempt,
  isInProgress,
  startAttempt,
  tryAgain,
  type Attempt,
  type Quiz,
} from '@yunakquiz/core';
import { useState } from 'react';

/** Holds one Attempt through its lifecycle. Every rule lives in core. */
export function useAttempt(quiz: Quiz) {
  const [attempt, setAttempt] = useState<Attempt>(() => startAttempt(quiz));

  return {
    attempt,
    /** True while the scout has chosen Options that leaving would discard. */
    inProgress: isInProgress(attempt),
    choose(questionId: number, optionId: number) {
      setAttempt((current) => chooseOption(current, questionId, optionId));
    },
    finish() {
      setAttempt((current) => finishAttempt(current));
    },
    tryAgain() {
      setAttempt((current) => tryAgain(current));
    },
  };
}
