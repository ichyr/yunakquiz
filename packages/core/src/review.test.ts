import { describe, expect, it } from 'vitest';
import { finishAttempt, isPerfect, optionOutcome, startAttempt } from './index.ts';
import { choose, quiz, seeded } from './sample.test-helpers.ts';

describe('the Review', () => {
  const reviewed = (answers: (readonly [string, string])[]) => {
    let attempt = startAttempt(quiz, seeded(3));
    for (const [prompt, letter] of answers) attempt = choose(attempt, prompt, letter);
    return finishAttempt(attempt);
  };

  const someIncorrect = () =>
    reviewed([
      ['Q1', 'A'],
      ['Q2', 'B'],
      ['Q3', 'A'],
      ['Q4', 'D'],
      ['Q5', 'A'],
    ]);

  it('scores the Questions answered correctly out of the total', () => {
    expect(someIncorrect().review.score).toEqual({ correct: 3, total: 5 });
  });

  it('shows each Question in Attempt order with the chosen and Correct Option and the Explanation', () => {
    const attempt = someIncorrect();
    const { review } = attempt;

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

  it('is perfect only when every Question was answered correctly', () => {
    const allCorrect = reviewed(['Q1', 'Q2', 'Q3', 'Q4', 'Q5'].map((prompt) => [prompt, 'A']));

    expect(isPerfect(allCorrect.review.score)).toBe(true);
    expect(isPerfect(someIncorrect().review.score)).toBe(false);
  });

  it('marks the Correct Option correct, a wrongly chosen Option wrong and the rest other', () => {
    const q2 = someIncorrect().review.items.find((item) => item.prompt === 'Q2')!;
    const [other] = q2.options.filter(
      (option) => option.id !== q2.chosenOptionId && option.id !== q2.correctOptionId,
    );

    expect(optionOutcome(q2, q2.correctOptionId)).toBe('correct');
    expect(optionOutcome(q2, q2.chosenOptionId)).toBe('wrong');
    expect(optionOutcome(q2, other!.id)).toBe('other');
  });

  it('marks the chosen Option correct when it is the Correct Option', () => {
    const q1 = someIncorrect().review.items.find((item) => item.prompt === 'Q1')!;

    expect(optionOutcome(q1, q1.chosenOptionId)).toBe('correct');
  });
});
