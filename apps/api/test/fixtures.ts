import type { QuizInput } from '@yunakquiz/core';

const question = (prompt: string) => ({
  prompt,
  options: [{ text: 'Yes', correct: true as const }, { text: 'No' }],
  explanation: `First paragraph about ${prompt}.\n\nSecond paragraph.`,
});

export const bohun: QuizInput = {
  slug: 'ivan-bohun',
  title: 'Іван Богун',
  description: 'Видатний полководець, патрон куреня.',
  language: 'uk',
  categories: [
    { slug: 'patrony-kureniv', name: 'Патрони куренів' },
    { slug: 'istoriia-ukrainy', name: 'Історія України' },
  ],
  questions: [question('Хто такий Іван Богун?')],
};

export const knots: QuizInput = {
  slug: 'basic-knots',
  title: 'Basic Knots',
  description: 'Reef knot, bowline and 100% of the classics.',
  language: 'en',
  categories: [{ slug: 'istoriia-ukrainy', name: 'Історія України' }],
  questions: [question('Which knot joins two ropes?'), question('Which knot makes a loop?')],
};
