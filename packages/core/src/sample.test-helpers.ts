// Shared by core's tests; not exported from the package.
import { chooseOption, quizSchema, type Attempt, type Quiz } from './index.ts';

/** Five Questions; every Correct Option ends in "A". */
export const quiz: Quiz = quizSchema.parse({
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

/** Deterministic random source (mulberry32), so shuffles are repeatable. */
export function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), seed | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Chooses the Option with text `${prompt} ${letter}`. */
export function choose(attempt: Attempt, prompt: string, letter: string) {
  const question = attempt.questions.find((candidate) => candidate.prompt === prompt)!;
  const option = question.options.find((candidate) => candidate.text === `${prompt} ${letter}`)!;
  return chooseOption(attempt, question.id, option.id);
}

/** Chooses the first shown Option of each given Question. */
export function chooseFirstOptions(attempt: Attempt, questions = attempt.questions) {
  return questions.reduce<Attempt>(
    (acc, question) => chooseOption(acc, question.id, question.options[0]!.id),
    attempt,
  );
}
