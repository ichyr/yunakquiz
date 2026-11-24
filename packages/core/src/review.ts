import type { AnsweringAttempt, AttemptOption } from './attempt.ts';
import { correctOptionIndex } from './quiz.ts';

export interface Score {
  correct: number;
  total: number;
}

/** Every Question answered correctly. */
export function isPerfect(score: Score): boolean {
  return score.correct === score.total;
}

export interface ReviewItem {
  questionId: number;
  prompt: string;
  /** Options in the order shown during the Attempt. */
  options: AttemptOption[];
  chosenOptionId: number;
  correctOptionId: number;
  isCorrect: boolean;
  explanation: string;
}

export type OptionOutcome = 'correct' | 'wrong' | 'other';

/** How the Review marks an Option: the Correct Option, a wrongly chosen Option, or neither. */
export function optionOutcome(item: ReviewItem, optionId: number): OptionOutcome {
  if (optionId === item.correctOptionId) return 'correct';
  if (optionId === item.chosenOptionId) return 'wrong';
  return 'other';
}

export interface Review {
  score: Score;
  /** One item per Question, in the order shown during the Attempt. */
  items: ReviewItem[];
}

/**
 * Internal to core: `finishAttempt` is the only way to get a Review.
 * Assumes every Question has a chosen Option; `finishAttempt` checks that first.
 */
export function buildReview(attempt: AnsweringAttempt): Review {
  const items = attempt.questions.map((question): ReviewItem => {
    const source = attempt.quiz.questions[question.id]!;
    const chosenOptionId = attempt.chosenOptions[question.id]!;
    const correctOptionId = correctOptionIndex(source);
    return {
      questionId: question.id,
      prompt: question.prompt,
      options: question.options,
      chosenOptionId,
      correctOptionId,
      isCorrect: chosenOptionId === correctOptionId,
      explanation: source.explanation,
    };
  });

  return {
    score: { correct: items.filter((item) => item.isCorrect).length, total: items.length },
    items,
  };
}
