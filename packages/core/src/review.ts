import { canFinish, type Attempt, type AttemptOption } from './attempt';

export interface Score {
  correct: number;
  total: number;
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

export interface Review {
  score: Score;
  /** One item per Question, in the order shown during the Attempt. */
  items: ReviewItem[];
}

export function buildReview(attempt: Attempt): Review {
  if (!canFinish(attempt)) {
    throw new Error('Every Question needs an answer before the Review');
  }

  const items = attempt.questions.map((question): ReviewItem => {
    const source = attempt.quiz.questions[question.id]!;
    const chosenOptionId = attempt.answers[question.id]!;
    const correctOptionId = source.options.findIndex((option) => option.correct);
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
