import type { Quiz } from './quiz.ts';
import { buildReview, type Review } from './review.ts';

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

interface AttemptBase {
  quiz: Quiz;
  /** Questions in the order shown for this Attempt. */
  questions: AttemptQuestion[];
  /** Chosen Option id, keyed by Question id. */
  chosenOptions: Record<number, number>;
}

/** The scout is choosing Options; no feedback yet. */
export interface AnsweringAttempt extends AttemptBase {
  phase: 'answering';
}

/** The scout has finished; the Review is fixed. */
export interface ReviewedAttempt extends AttemptBase {
  phase: 'reviewed';
  review: Review;
}

/**
 * One run through a Quiz. It starts `answering`, becomes `reviewed` on Finish,
 * and Try again starts a fresh `answering` Attempt. Every transition throws
 * when called in the wrong phase.
 */
export type Attempt = AnsweringAttempt | ReviewedAttempt;

export function startAttempt(quiz: Quiz, random: RandomSource = Math.random): AnsweringAttempt {
  const questions = quiz.questions.map((question, id) => ({ id, question }));

  return {
    phase: 'answering',
    quiz,
    questions: shuffle(questions, random).map(({ id, question }) => ({
      id,
      prompt: question.prompt,
      options: shuffle(
        question.options.map((option, optionId) => ({ id: optionId, text: option.text })),
        random,
      ),
    })),
    chosenOptions: {},
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

function expectPhase<P extends Attempt['phase']>(
  attempt: Attempt,
  phase: P,
  action: string,
): asserts attempt is Extract<Attempt, { phase: P }> {
  if (attempt.phase !== phase) {
    throw new Error(`Cannot ${action}: the Attempt is ${attempt.phase}`);
  }
}

/** Records the scout's chosen Option for a Question, replacing any earlier choice. */
export function chooseOption(
  attempt: Attempt,
  questionId: number,
  optionId: number,
): AnsweringAttempt {
  expectPhase(attempt, 'answering', 'choose an Option');
  const question = attempt.questions.find((candidate) => candidate.id === questionId);
  if (!question?.options.some((option) => option.id === optionId)) {
    throw new Error(`Option ${optionId} is not part of Question ${questionId}`);
  }
  return { ...attempt, chosenOptions: { ...attempt.chosenOptions, [questionId]: optionId } };
}

/** How many Questions have a chosen Option. */
export function answeredCount(attempt: Attempt): number {
  return Object.keys(attempt.chosenOptions).length;
}

/** "Finish" is available only once every Question has a chosen Option. */
export function canFinish(attempt: Attempt): boolean {
  return (
    attempt.phase === 'answering' &&
    attempt.questions.every((question) => question.id in attempt.chosenOptions)
  );
}

/** Ends the Attempt and builds its Review. */
export function finishAttempt(attempt: Attempt): ReviewedAttempt {
  expectPhase(attempt, 'answering', 'finish');
  if (!canFinish(attempt)) {
    throw new Error('Every Question needs a chosen Option before Finish');
  }
  return { ...attempt, phase: 'reviewed', review: buildReview(attempt) };
}

/** Starts a fresh Attempt at the same Quiz, newly shuffled. */
export function tryAgain(attempt: Attempt, random: RandomSource = Math.random): AnsweringAttempt {
  expectPhase(attempt, 'reviewed', 'try again');
  return startAttempt(attempt.quiz, random);
}

/** True while the scout has chosen Options that leaving would discard. */
export function isInProgress(attempt: Attempt): boolean {
  return attempt.phase === 'answering' && answeredCount(attempt) > 0;
}
