// Sample content for Storybook stories. Real Quizzes live in apps/api/seed/.
import {
  buildReview,
  chooseOption,
  quizSchema,
  startAttempt,
  type Category,
  type QuizSummary,
} from '@yunakquiz/core';

export const sampleQuiz = quizSchema.parse({
  slug: 'knots',
  title: 'Knots every scout should know',
  description: 'Reef knot, bowline and clove hitch: when to use each and why.',
  language: 'en',
  categories: [{ slug: 'scoutcraft', name: 'Scoutcraft' }],
  questions: [
    {
      prompt: 'Which knot joins two ropes of the same thickness?',
      options: [{ text: 'Reef knot', correct: true }, { text: 'Clove hitch' }, { text: 'Bowline' }],
      explanation:
        'The reef knot (square knot) joins two ends of equal thickness, for example to tie off a bandage.\n\nIt slips with ropes of different thickness; use a sheet bend there.',
    },
    {
      prompt: 'Which knot makes a fixed loop that will not slip?',
      options: [{ text: 'Clove hitch' }, { text: 'Bowline', correct: true }],
      explanation: 'The bowline makes a fixed loop that does not tighten under load.',
    },
    {
      prompt: 'Is a clove hitch secure on its own under a changing load?',
      options: [{ text: 'Yes' }, { text: 'No', correct: true }],
      explanation:
        'A clove hitch can work loose when the load changes direction, so finish it with half hitches.',
    },
  ],
});

export const sampleQuizSummaries: QuizSummary[] = [
  {
    slug: 'ivan-bohun',
    title: 'Іван Богун',
    description:
      'Іван Богун – видатний полководець, політик, державний діяч. Патрон 73 куреня УПЮ у Львові.',
    language: 'uk',
  },
  {
    slug: sampleQuiz.slug,
    title: sampleQuiz.title,
    description: sampleQuiz.description,
    language: sampleQuiz.language,
  },
];

export const sampleCategories: Category[] = [
  { slug: 'istoriia-ukrainy', name: 'Історія України' },
  { slug: 'patrony-kureniv', name: 'Патрони куренів' },
  { slug: 'scoutcraft', name: 'Scoutcraft' },
];

/** Not shuffled, so stories look the same every time. */
export function sampleAttempt() {
  return startAttempt(sampleQuiz, () => 0.99);
}

/** An Attempt with the first Question wrong and the rest right. */
export function sampleReview() {
  let attempt = sampleAttempt();
  attempt = chooseOption(attempt, 0, 1);
  attempt = chooseOption(attempt, 1, 1);
  attempt = chooseOption(attempt, 2, 1);
  return buildReview(attempt);
}
