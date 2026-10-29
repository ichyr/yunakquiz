import { z } from 'zod';

const text = z.string().trim().min(1);

const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, digits and single hyphens');

export const categorySchema = z.object({
  slug,
  name: text,
});

export const optionSchema = z.object({
  text,
  correct: z.literal(true).optional(),
});

export const questionSchema = z
  .object({
    prompt: text,
    options: z.array(optionSchema).min(2),
    explanation: text,
  })
  .refine((question) => question.options.filter((option) => option.correct).length === 1, {
    message: 'A Question needs exactly one Correct Option',
    path: ['options'],
  });

export const quizSchema = z.object({
  slug,
  title: text,
  description: text,
  language: text,
  categories: z.array(categorySchema).min(1),
  questions: z.array(questionSchema).min(1),
});

/** How a Quiz appears in Quiz lists and search results. */
export const quizSummarySchema = quizSchema.pick({
  slug: true,
  title: true,
  description: true,
  language: true,
});

export const categoryWithQuizzesSchema = z.object({
  category: categorySchema,
  quizzes: z.array(quizSummarySchema),
});

export type Category = z.infer<typeof categorySchema>;
export type Option = z.infer<typeof optionSchema>;
export type Question = z.infer<typeof questionSchema>;
export type Quiz = z.infer<typeof quizSchema>;
/** A Quiz as written in a seed file, before parsing. */
export type QuizInput = z.input<typeof quizSchema>;
export type QuizSummary = z.infer<typeof quizSummarySchema>;
export type CategoryWithQuizzes = z.infer<typeof categoryWithQuizzesSchema>;
