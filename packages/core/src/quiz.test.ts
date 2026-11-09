import { describe, expect, it } from 'vitest';
import { quizSchema } from './index.ts';

const validQuiz = {
  slug: 'ivan-bohun',
  title: 'Іван Богун',
  description: 'Видатний полководець.',
  language: 'uk',
  categories: [{ slug: 'patrony-kureniv', name: 'Патрони куренів' }],
  questions: [
    {
      prompt: 'Коли і де народився Іван Богун?',
      options: [{ text: 'Острог, 1576' }, { text: 'Невідомо', correct: true }],
      explanation: 'Достеменно невідомо.',
    },
  ],
};

describe('quizSchema', () => {
  it('accepts a Quiz that follows the content rules', () => {
    expect(quizSchema.safeParse(validQuiz).success).toBe(true);
  });

  it.each([
    ['UK', 'uk'],
    ['en-us', 'en-US'],
    ['uk-UA', 'uk-UA'],
  ])('stores the Quiz Language %s as %s', (written, stored) => {
    const parsed = quizSchema.parse({ ...validQuiz, language: written });
    expect(parsed.language).toBe(stored);
  });

  it('names the Quiz Language it rejects and suggests a tag', () => {
    const result = quizSchema.safeParse({ ...validQuiz, language: 'english' });
    expect(result.error?.issues[0]?.message).toMatch(/"english".*uk or en/);
  });

  it('names the repeated Category and points at the repeated entry', () => {
    const other = { slug: 'istoriia-ukrainy', name: 'Історія України' };
    const quiz = { ...validQuiz, categories: [validQuiz.categories[0], other, other] };

    const issue = quizSchema.safeParse(quiz).error?.issues[0];

    expect(issue?.message).toContain('istoriia-ukrainy');
    expect(issue?.path).toEqual(['categories', 2]);
  });

  it.each([
    ['no', [{ text: 'A' }, { text: 'B' }]],
    [
      'two',
      [
        { text: 'A', correct: true },
        { text: 'B', correct: true },
      ],
    ],
  ])('rejects a Question with %s Correct Options', (_, options) => {
    const quiz = withQuestion({ options });
    expect(quizSchema.safeParse(quiz).success).toBe(false);
  });

  it.each([
    ['no Questions', { ...validQuiz, questions: [] }],
    ['no Categories', { ...validQuiz, categories: [] }],
    ['a blank title', { ...validQuiz, title: '  ' }],
    ['a slug with spaces', { ...validQuiz, slug: 'ivan bohun' }],
    ['an uppercase Category slug', { ...validQuiz, categories: [{ slug: 'Patrony', name: 'P' }] }],
    [
      'the same Category twice',
      { ...validQuiz, categories: [validQuiz.categories[0], validQuiz.categories[0]] },
    ],
    ['a Quiz Language that is not a language tag', { ...validQuiz, language: 'uk UA' }],
    ['a Quiz Language that is a language name', { ...validQuiz, language: 'ukrainian' }],
    ['a short Quiz Language name', { ...validQuiz, language: 'english' }],
    ['a Quiz Language the app cannot name', { ...validQuiz, language: 'xx' }],
    ['a single Option', withQuestion({ options: [{ text: 'Невідомо', correct: true }] })],
    ['a blank prompt', withQuestion({ prompt: '' })],
    ['a blank Explanation', withQuestion({ explanation: ' ' })],
    ['a blank Option', withQuestion({ options: [{ text: '' }, { text: 'B', correct: true }] })],
  ])('rejects a Quiz with %s', (_, quiz) => {
    expect(quizSchema.safeParse(quiz).success).toBe(false);
  });
});

function withQuestion(overrides: Record<string, unknown>) {
  return { ...validQuiz, questions: [{ ...validQuiz.questions[0], ...overrides }] };
}
