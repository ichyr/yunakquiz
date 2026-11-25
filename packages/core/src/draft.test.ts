import { describe, expect, it } from 'vitest';
import {
  draftQuizSchema,
  MAX_OPTIONS,
  MAX_QUESTIONS,
  MAX_TEXT_LENGTH,
  quizSchema,
  validateForPublish,
} from './index.ts';

const names = new Map([['knots', 'Knots']]);
const complete = {
  slug: 'basic-knots',
  title: 'Knots',
  description: 'About knots',
  language: 'EN',
  categories: ['knots'],
  questions: [
    {
      prompt: 'Which joins ropes?',
      options: [{ text: 'Reef', correct: true as const }, { text: 'Granny' }],
      explanation: 'Reef.',
    },
  ],
};
const option = (text = 'x') => ({ text });

describe('draftQuizSchema', () => {
  it('accepts a slug alone and fills the rest empty', () => {
    expect(draftQuizSchema.parse({ slug: 'new-quiz' })).toEqual({
      slug: 'new-quiz',
      title: '',
      description: '',
      language: '',
      categories: [],
      questions: [],
    });
  });

  it('accepts half-written Questions, with no Correct Option yet', () => {
    const draft = draftQuizSchema.safeParse({
      slug: 'q',
      questions: [{ prompt: '', options: [option('')] }],
    });
    expect(draft.success).toBe(true);
  });

  it('still needs a valid slug', () => {
    expect(draftQuizSchema.safeParse({}).success).toBe(false);
    expect(draftQuizSchema.safeParse({ slug: 'Not A Slug' }).success).toBe(false);
  });

  it('rejects two Correct Options in one Question', () => {
    const questions = [
      {
        options: [
          { text: 'a', correct: true },
          { text: 'b', correct: true },
        ],
      },
    ];
    expect(draftQuizSchema.safeParse({ slug: 'q', questions }).success).toBe(false);
  });

  it('rejects a repeated Category', () => {
    expect(draftQuizSchema.safeParse({ slug: 'q', categories: ['a', 'a'] }).success).toBe(false);
  });

  it('enforces the limits', () => {
    const accepts = (extra: object) => draftQuizSchema.safeParse({ slug: 'q', ...extra }).success;
    expect(accepts({ questions: Array.from({ length: MAX_QUESTIONS }, () => ({})) })).toBe(true);
    expect(accepts({ questions: Array.from({ length: MAX_QUESTIONS + 1 }, () => ({})) })).toBe(
      false,
    );
    const options = (n: number) => [{ options: Array.from({ length: n }, () => option()) }];
    expect(accepts({ questions: options(MAX_OPTIONS) })).toBe(true);
    expect(accepts({ questions: options(MAX_OPTIONS + 1) })).toBe(false);
    expect(accepts({ title: 'x'.repeat(MAX_TEXT_LENGTH) })).toBe(true);
    expect(accepts({ title: 'x'.repeat(MAX_TEXT_LENGTH + 1) })).toBe(false);
    expect(accepts({ questions: [{ explanation: 'x'.repeat(MAX_TEXT_LENGTH + 1) }] })).toBe(false);
  });
});

describe('quizSchema limits', () => {
  const quiz = { ...complete, categories: [{ slug: 'knots', name: 'Knots' }] };
  const question = quiz.questions[0]!;

  it('rejects more than 100 Questions', () => {
    const many = (n: number) => ({ ...quiz, questions: Array(n).fill(question) });
    expect(quizSchema.safeParse(many(MAX_QUESTIONS)).success).toBe(true);
    expect(quizSchema.safeParse(many(MAX_QUESTIONS + 1)).success).toBe(false);
  });

  it('rejects more than 10 Options and more than 5,000 characters', () => {
    const options = [
      { text: 'a', correct: true as const },
      ...Array.from({ length: MAX_OPTIONS }, () => option()),
    ];
    expect(quizSchema.safeParse({ ...quiz, questions: [{ ...question, options }] }).success).toBe(
      false,
    );
    const long = 'x'.repeat(MAX_TEXT_LENGTH + 1);
    expect(quizSchema.safeParse({ ...quiz, description: long }).success).toBe(false);
  });
});

describe('validateForPublish', () => {
  it('returns the Quiz with a canonical language and Category names', () => {
    const result = validateForPublish(draftQuizSchema.parse(complete), names);
    expect(result.ok && result.quiz.language).toBe('en');
    expect(result.ok && result.quiz.categories).toEqual([{ slug: 'knots', name: 'Knots' }]);
  });

  it('lists everything wrong at once, with paths', () => {
    const draft = draftQuizSchema.parse({
      slug: 'q',
      title: '',
      language: 'zzzzz-not',
      questions: [{ prompt: 'p', options: [option('a')], explanation: '' }],
    });
    const result = validateForPublish(draft, names);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const paths = result.issues.map((issue) => issue.path.join('.'));
    expect(paths).toEqual(
      expect.arrayContaining([
        'title',
        'description',
        'language',
        'categories',
        'questions.0.options',
        'questions.0.explanation',
      ]),
    );
  });

  it('rejects a draft with no Questions', () => {
    const draft = draftQuizSchema.parse({ ...complete, questions: [] });
    expect(validateForPublish(draft, names).ok).toBe(false);
  });
});
