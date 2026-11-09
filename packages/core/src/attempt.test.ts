import { describe, expect, it } from 'vitest';
import {
  answer,
  buildReview,
  canFinish,
  quizSchema,
  startAttempt,
  type Attempt,
  type Quiz,
} from './index.ts';

const quiz: Quiz = quizSchema.parse({
  slug: 'sample',
  title: 'Sample',
  description: 'Sample Quiz',
  language: 'en',
  categories: [{ slug: 'sample', name: 'Sample' }],
  questions: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'].map((prompt) => ({
    prompt,
    options: [
      { text: `${prompt} A`, correct: true },
      { text: `${prompt} B` },
      { text: `${prompt} C` },
      { text: `${prompt} D` },
    ],
    explanation: `Because ${prompt} A.`,
  })),
});

// Deterministic random source (mulberry32), so shuffles are repeatable.
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), seed | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const prompts = (attempt: ReturnType<typeof startAttempt>) =>
  attempt.questions.map((question) => question.prompt);

describe('startAttempt', () => {
  it('offers every Question once, each with all of its Options once', () => {
    const attempt = startAttempt(quiz, seeded(1));

    expect(prompts(attempt).toSorted()).toEqual(['Q1', 'Q2', 'Q3', 'Q4', 'Q5']);
    for (const question of attempt.questions) {
      expect(question.options.map((option) => option.text).toSorted()).toEqual(
        ['A', 'B', 'C', 'D'].map((letter) => `${question.prompt} ${letter}`),
      );
    }
  });

  it('orders Questions and Options by the random source', () => {
    const first = startAttempt(quiz, seeded(1));

    expect(startAttempt(quiz, seeded(1))).toEqual(first);
    expect(prompts(startAttempt(quiz, seeded(2)))).not.toEqual(prompts(first));
  });

  it('does not reveal the Correct Option during the Attempt', () => {
    const attempt = startAttempt(quiz, seeded(1));

    for (const option of attempt.questions.flatMap((question) => question.options)) {
      expect(option).not.toHaveProperty('correct');
    }
  });
});

const answerAll = (attempt: Attempt, questions = attempt.questions) =>
  questions.reduce((acc, question) => answer(acc, question.id, question.options[0]!.id), attempt);

// Every Correct Option in the sample Quiz ends in "A".
const choose = (attempt: Attempt, prompt: string, letter: string) => {
  const question = attempt.questions.find((candidate) => candidate.prompt === prompt)!;
  const option = question.options.find((candidate) => candidate.text === `${prompt} ${letter}`)!;
  return answer(attempt, question.id, option.id);
};

describe('answer and canFinish', () => {
  it('allows Finish only once every Question has an answer, in any order', () => {
    const attempt = startAttempt(quiz, seeded(1));
    const reversed = attempt.questions.toReversed();

    expect(canFinish(attempt)).toBe(false);
    expect(canFinish(answerAll(attempt, reversed.slice(1)))).toBe(false);
    expect(canFinish(answerAll(attempt, reversed))).toBe(true);
  });

  it('lets the scout change an answer', () => {
    const attempt = startAttempt(quiz, seeded(1));
    const [question] = attempt.questions;
    const [firstOption, secondOption] = question!.options;

    const changed = answer(
      answer(attempt, question!.id, firstOption!.id),
      question!.id,
      secondOption!.id,
    );

    expect(changed.answers[question!.id]).toBe(secondOption!.id);
  });

  it('leaves the original Attempt unchanged', () => {
    const attempt = startAttempt(quiz, seeded(1));

    answerAll(attempt);

    expect(attempt.answers).toEqual({});
  });

  it('rejects an Option that does not belong to the Question', () => {
    const attempt = startAttempt(quiz, seeded(1));

    expect(() => answer(attempt, 0, 99)).toThrow();
    expect(() => answer(attempt, 99, 0)).toThrow();
  });
});

describe('buildReview', () => {
  const finished = () => {
    let attempt = startAttempt(quiz, seeded(3));
    for (const [prompt, letter] of [
      ['Q1', 'A'],
      ['Q2', 'B'],
      ['Q3', 'A'],
      ['Q4', 'D'],
      ['Q5', 'A'],
    ] as const) {
      attempt = choose(attempt, prompt, letter);
    }
    return attempt;
  };

  it('scores the Questions answered correctly out of the total', () => {
    expect(buildReview(finished()).score).toEqual({ correct: 3, total: 5 });
  });

  it('shows each Question in Attempt order with the chosen and Correct Option and the Explanation', () => {
    const attempt = finished();
    const review = buildReview(attempt);

    expect(review.items.map((item) => item.prompt)).toEqual(
      attempt.questions.map((question) => question.prompt),
    );

    const q2 = review.items.find((item) => item.prompt === 'Q2')!;
    const textOf = (id: number) => q2.options.find((option) => option.id === id)!.text;
    expect(q2.isCorrect).toBe(false);
    expect(textOf(q2.chosenOptionId)).toBe('Q2 B');
    expect(textOf(q2.correctOptionId)).toBe('Q2 A');
    expect(q2.explanation).toBe('Because Q2 A.');
    expect(q2.options.map((option) => option.text)).toEqual(
      attempt.questions.find((question) => question.prompt === 'Q2')!.options.map((o) => o.text),
    );
  });

  it('refuses to build a Review before every Question has an answer', () => {
    const attempt = startAttempt(quiz, seeded(3));

    expect(() => buildReview(answer(attempt, 0, 0))).toThrow();
  });
});
