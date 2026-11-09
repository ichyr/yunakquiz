import { z } from 'zod';

const text = z.string().trim().min(1);

const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, digits and single hyphens');

const languageNames = new Intl.DisplayNames('en', { type: 'language', fallback: 'none' });

/**
 * A BCP 47 language tag such as `uk` or `en-US` that the app can name with Intl.DisplayNames.
 * Parsed into its standard spelling, so `UK` becomes `uk` and `en-us` becomes `en-US`.
 */
const languageTag = text.transform((value, context) => {
  const rejected = `Quiz Language "${value}" is not a language the app can name. Use a tag such as uk or en`;
  let tag: string | undefined;
  try {
    const tags = Intl.getCanonicalLocales(value);
    tag = tags.length === 1 ? tags[0] : undefined;
    if (tag !== undefined && languageNames.of(tag) === undefined) tag = undefined;
  } catch {
    tag = undefined;
  }
  if (tag === undefined) {
    context.addIssue({ code: 'custom', message: rejected });
    return z.NEVER;
  }
  return tag;
});

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
  language: languageTag,
  categories: z
    .array(categorySchema)
    .min(1)
    .superRefine((categories, context) => {
      const seen = new Set<string>();
      categories.forEach((category, index) => {
        if (seen.has(category.slug)) {
          context.addIssue({
            code: 'custom',
            message: `A Quiz lists each Category once, but "${category.slug}" is repeated`,
            path: [index],
          });
        }
        seen.add(category.slug);
      });
    }),
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
