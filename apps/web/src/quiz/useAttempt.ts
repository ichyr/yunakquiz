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
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

/**
 * Holds one Attempt through its lifecycle. Every rule lives in core.
 * Core throws on an illegal action. The action runs here, in the handler, not inside a
 * state updater: an error thrown while React renders would skip this catch. On failure the
 * Attempt is kept, the scout sees a toast, and the action returns false.
 */
export function useAttempt(quiz: Quiz) {
  const { t } = useTranslation();
  const [attempt, setAttempt] = useState<Attempt>(() => startAttempt(quiz));

  // Each action is a separate click and React re-renders between clicks,
  // so reading `attempt` from the closure is safe.
  const run = (action: (current: Attempt) => Attempt): boolean => {
    try {
      setAttempt(action(attempt));
      return true;
    } catch (error) {
      console.error(error);
      toast.error(t('attempt.actionFailed'));
      return false;
    }
  };

  return {
    attempt,
    /** True while the scout has chosen Options that leaving would discard. */
    inProgress: isInProgress(attempt),
    choose: (questionId: number, optionId: number) =>
      run((current) => chooseOption(current, questionId, optionId)),
    finish: () => run(finishAttempt),
    tryAgain: () => run(tryAgain),
  };
}
