import type { Quiz } from './quiz.ts';

/** Returns a number in [0, 1), like Math.random. */
export type RandomSource = () => number;

/** A Question as offered during an Attempt: shuffled Options, no Correct Option. */
export interface AttemptQuestion {
  /** Position of the Question in the Quiz. */
  id: number;
  prompt: string;
  options: AttemptOption[];
}

export interface AttemptOption {
  /** Position of the Option in its Question. */
  id: number;
  text: string;
}

export interface Attempt {
  quiz: Quiz;
  /** Questions in the order shown for this Attempt. */
  questions: AttemptQuestion[];
  /** Chosen Option id, keyed by Question id. */
  answers: Record<number, number>;
}

export function startAttempt(quiz: Quiz, random: RandomSource = Math.random): Attempt {
  const questions = quiz.questions.map((question, id) => ({ id, question }));

  return {
    quiz,
    questions: shuffle(questions, random).map(({ id, question }) => ({
      id,
      prompt: question.prompt,
      options: shuffle(
        question.options.map((option, optionId) => ({ id: optionId, text: option.text })),
        random,
      ),
    })),
    answers: {},
  };
}

/** Fisher–Yates shuffle into a new array. */
function shuffle<T>(items: readonly T[], random: RandomSource): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

/** Records the scout's chosen Option for a Question, replacing any earlier choice. */
export function answer(attempt: Attempt, questionId: number, optionId: number): Attempt {
  const question = attempt.questions.find((candidate) => candidate.id === questionId);
  if (!question?.options.some((option) => option.id === optionId)) {
    throw new Error(`Option ${optionId} is not part of Question ${questionId}`);
  }
  return { ...attempt, answers: { ...attempt.answers, [questionId]: optionId } };
}

/** "Finish" is available only once every Question has an answer. */
export function canFinish(attempt: Attempt): boolean {
  return attempt.questions.every((question) => question.id in attempt.answers);
}
