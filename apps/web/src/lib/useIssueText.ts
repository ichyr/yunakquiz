import {
  MAX_CATEGORIES,
  MAX_OPTIONS,
  MAX_QUESTIONS,
  MAX_TEXT_LENGTH,
  type QuizIssueKind,
} from '@yunakquiz/core';
import { useTranslation } from 'react-i18next';

const limits: Partial<Record<QuizIssueKind, number>> = {
  title: MAX_TEXT_LENGTH,
  description: MAX_TEXT_LENGTH,
  prompt: MAX_TEXT_LENGTH,
  explanation: MAX_TEXT_LENGTH,
  optionText: MAX_TEXT_LENGTH,
  categories: MAX_CATEGORIES,
  questions: MAX_QUESTIONS,
  options: MAX_OPTIONS,
};

/** Text, in the Interface Language, for what is wrong with a field of the editor. Core's own messages are English. */
export function useIssueText() {
  const { t } = useTranslation();
  return (kind: QuizIssueKind): string =>
    t(`author.editor.issues.${kind}`, { max: limits[kind] ?? 0 });
}
