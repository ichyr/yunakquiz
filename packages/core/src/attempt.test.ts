import { describe, expect, it } from 'vitest';
import {
  answeredCount,
  canFinish,
  chooseOption,
  finishAttempt,
  isInProgress,
  startAttempt,
  tryAgain,
  type Attempt,
} from './index.ts';
import { chooseFirstOptions, quiz, seeded } from './sample.test-helpers.ts';

const prompts = (attempt: Attempt) => attempt.questions.map((question) => question.prompt);

describe('startAttempt', () => {
  it('offers every Question once, each with all of its Options once', () => {
    const attempt = startAttempt(quiz, seeded(1));

    expect(attempt.phase).toBe('answering');
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

describe('choosing Options', () => {
  it('allows Finish only once every Question has a chosen Option, in any order', () => {
    const attempt = startAttempt(quiz, seeded(1));
    const reversed = attempt.questions.toReversed();

    expect(canFinish(attempt)).toBe(false);
    expect(canFinish(chooseFirstOptions(attempt, reversed.slice(1)))).toBe(false);
    expect(canFinish(chooseFirstOptions(attempt, reversed))).toBe(true);
  });

  it('lets the scout change a chosen Option without counting the Question twice', () => {
    const attempt = startAttempt(quiz, seeded(1));
    const [question] = attempt.questions;
    const [firstOption, secondOption] = question!.options;

    const once = chooseOption(attempt, question!.id, firstOption!.id);
    const changed = chooseOption(once, question!.id, secondOption!.id);

    expect(answeredCount(attempt)).toBe(0);
    expect(answeredCount(once)).toBe(1);
    expect(answeredCount(changed)).toBe(1);
    expect(changed.chosenOptions[question!.id]).toBe(secondOption!.id);
  });

  it('leaves the original Attempt unchanged', () => {
    const attempt = startAttempt(quiz, seeded(1));

    chooseFirstOptions(attempt);

    expect(attempt.chosenOptions).toEqual({});
  });

  it('rejects an Option that does not belong to the Question', () => {
    const attempt = startAttempt(quiz, seeded(1));

    expect(() => chooseOption(attempt, 0, 99)).toThrow();
    expect(() => chooseOption(attempt, 99, 0)).toThrow();
  });
});

describe('the Attempt lifecycle', () => {
  it('is in progress once an Option is chosen, until Finish', () => {
    const attempt = startAttempt(quiz, seeded(1));
    const started = chooseOption(attempt, 0, 0);
    const answered = chooseFirstOptions(attempt);

    expect(isInProgress(attempt)).toBe(false);
    expect(isInProgress(started)).toBe(true);
    expect(isInProgress(answered)).toBe(true);
    expect(isInProgress(finishAttempt(answered))).toBe(false);
  });

  it('becomes reviewed on Finish, keeping the chosen Options', () => {
    const answered = chooseFirstOptions(startAttempt(quiz, seeded(1)));
    const reviewed = finishAttempt(answered);

    expect(reviewed.phase).toBe('reviewed');
    expect(reviewed.chosenOptions).toEqual(answered.chosenOptions);
    expect(reviewed.review.items).toHaveLength(quiz.questions.length);
    expect(canFinish(reviewed)).toBe(false);
  });

  it('refuses Finish until every Question has a chosen Option', () => {
    const attempt = startAttempt(quiz, seeded(1));

    expect(() => finishAttempt(attempt)).toThrow();
    expect(() => finishAttempt(chooseOption(attempt, 0, 0))).toThrow();
  });

  it('refuses changes once reviewed', () => {
    const reviewed = finishAttempt(chooseFirstOptions(startAttempt(quiz, seeded(1))));

    expect(() => chooseOption(reviewed, 0, 0)).toThrow();
    expect(() => finishAttempt(reviewed)).toThrow();
  });

  it('Try again starts a fresh, newly shuffled Attempt at the same Quiz', () => {
    const reviewed = finishAttempt(chooseFirstOptions(startAttempt(quiz, seeded(1))));
    const again = tryAgain(reviewed, seeded(2));

    expect(again).toEqual(startAttempt(quiz, seeded(2)));
    expect(again.phase).toBe('answering');
    expect(again.chosenOptions).toEqual({});
  });

  it('refuses Try again before Finish', () => {
    const attempt = startAttempt(quiz, seeded(1));

    expect(() => tryAgain(attempt)).toThrow();
    expect(() => tryAgain(chooseFirstOptions(attempt))).toThrow();
  });
});
