import { describe, expect, it } from 'vitest';
import { quizSchema } from './index';

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
