import { z } from 'zod';

/** Limits on Quiz content. Enforced by quizSchema and draftQuizSchema, shown in the editor. */
export const MAX_QUESTIONS = 100;
export const MAX_OPTIONS = 10;
export const MAX_TEXT_LENGTH = 5_000;
export const MAX_CATEGORIES = 20;
/** Longest BCP 47 tag a draft may hold; real tags are far shorter. */
const MAX_LANGUAGE_LENGTH = 35;

const text = z.string().trim().min(1).max(MAX_TEXT_LENGTH);

const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, digits and single hyphens');

const languageNames = new Intl.DisplayNames('en', { type: 'language', fallback: 'none' });

/**
 * A BCP 47 language tag such as `uk` or `en-US` that the app can name with Intl.DisplayNames.
 * Parsed into its standard spelling, so `UK` becomes `uk` and `en-us` becomes `en-US`.
 */
const languageTag = z
  .string()
  .trim()
  .min(1)
  .max(MAX_LANGUAGE_LENGTH)
  .transform((value, context) => {
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
    options: z.array(optionSchema).min(2).max(MAX_OPTIONS),
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
    .max(MAX_CATEGORIES)
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
  questions: z.array(questionSchema).min(1).max(MAX_QUESTIONS),
});

/** The Author of a Quiz as Guests see it: a display name, never an id or email. `null`: ownerless. */
export const quizAuthorSchema = z.object({ displayName: z.string() }).nullable();

/** A published Quiz as the Quiz screen gets it: the content plus who wrote it. */
export const quizViewSchema = quizSchema.extend({ author: quizAuthorSchema });

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

// Drafts. Same limits as a Quiz, but any field may be empty or missing, so an Author can save
// half-written work. `quizSchema` is enforced when the Quiz is published.

const draftText = z.string().max(MAX_TEXT_LENGTH);

export const draftOptionSchema = z.object({
  text: draftText.default(''),
  correct: z.literal(true).optional(),
});

export const draftQuestionSchema = z
  .object({
    prompt: draftText.default(''),
    options: z.array(draftOptionSchema).max(MAX_OPTIONS).default([]),
    explanation: draftText.default(''),
  })
  .refine((question) => question.options.filter((option) => option.correct).length <= 1, {
    message: 'A Question has at most one Correct Option',
    path: ['options'],
  });

/** What an Author saves. Categories are slugs of existing Categories. */
export const draftQuizSchema = z.object({
  slug,
  title: draftText.default(''),
  description: draftText.default(''),
  language: z.string().max(MAX_LANGUAGE_LENGTH).default(''),
  categories: z
    .array(slug)
    .max(MAX_CATEGORIES)
    .default([])
    .refine((slugs) => new Set(slugs).size === slugs.length, {
      message: 'A Quiz lists each Category once',
    }),
  questions: z.array(draftQuestionSchema).max(MAX_QUESTIONS).default([]),
});

export const quizStatusSchema = z.enum(['draft', 'published']);

/** A save: the draft content and the `version` the editor loaded (optimistic locking). */
export const saveQuizInputSchema = draftQuizSchema.extend({ version: z.number().int().min(1) });
export const publishQuizInputSchema = z.object({ version: z.number().int().min(1) });

/** A Quiz as the editor gets it. Only its Author and Admins ever receive this. */
export const authoringQuizSchema = draftQuizSchema.extend({
  status: quizStatusSchema,
  version: z.number().int(),
  authorId: z.number().int().nullable(),
  author: quizAuthorSchema,
  publishedAt: z.string().nullable(),
  updatedAt: z.string(),
});

export const authoringQuizItemSchema = z.object({
  slug: z.string(),
  title: z.string(),
  language: z.string(),
  status: quizStatusSchema,
  version: z.number().int(),
  author: quizAuthorSchema,
  publishedAt: z.string().nullable(),
  updatedAt: z.string(),
});

export const authoringQuizPageSchema = z.object({
  items: z.array(authoringQuizItemSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export const AUTHORING_PAGE_SIZE = 50;

/** One thing wrong with a Quiz that cannot be published yet. `path` points into the save body. */
export const quizIssueSchema = z.object({
  path: z.array(z.union([z.string(), z.number()])),
  message: z.string(),
});

export type Category = z.infer<typeof categorySchema>;
export type Option = z.infer<typeof optionSchema>;
export type Question = z.infer<typeof questionSchema>;
export type Quiz = z.infer<typeof quizSchema>;
/** A Quiz as written in a seed file, before parsing. */
export type QuizInput = z.input<typeof quizSchema>;
export type QuizSummary = z.infer<typeof quizSummarySchema>;
export type CategoryWithQuizzes = z.infer<typeof categoryWithQuizzesSchema>;

/** Position of the Correct Option in its Question. The schema guarantees exactly one. */
export function correctOptionIndex(question: Pick<Question, 'options'>): number {
  return question.options.findIndex((option) => option.correct);
}

export type DraftQuizInput = z.input<typeof draftQuizSchema>;
export type DraftQuiz = z.infer<typeof draftQuizSchema>;
export type QuizStatus = z.infer<typeof quizStatusSchema>;
export type QuizView = z.infer<typeof quizViewSchema>;
export type AuthoringQuiz = z.infer<typeof authoringQuizSchema>;
export type AuthoringQuizItem = z.infer<typeof authoringQuizItemSchema>;
export type AuthoringQuizPage = z.infer<typeof authoringQuizPageSchema>;
export type QuizIssue = z.infer<typeof quizIssueSchema>;

/**
 * Checks a draft against the full Quiz rules, as publishing does. `categories` are the slugs of
 * the draft; `categoryNames` maps each to its name. Returns the Quiz, or everything that is wrong
 * at once, with paths into the draft (`questions.2.options`).
 */
export function validateForPublish(
  draft: DraftQuiz,
  categoryNames: ReadonlyMap<string, string>,
): { ok: true; quiz: Quiz } | { ok: false; issues: QuizIssue[] } {
  const candidate = {
    ...draft,
    categories: draft.categories.map((categorySlug) => ({
      slug: categorySlug,
      name: categoryNames.get(categorySlug) ?? categorySlug,
    })),
  };
  const parsed = quizSchema.safeParse(candidate);
  if (parsed.success) return { ok: true, quiz: parsed.data };
  return {
    ok: false,
    issues: parsed.error.issues.map((issue) => ({
      // A Category is written as a slug in a save, but parsed as `{ slug, name }`.
      path: issue.path
        .filter((part): part is string | number => typeof part !== 'symbol')
        .filter((part, index, path) => !(path[0] === 'categories' && index === 2)),
      message: issue.message,
    })),
  };
}
