import { z } from 'zod';

export const CATEGORY_NAME_MAX_LENGTH = 100;
/** Lowercase words joined by single hyphens, for the Category address. The web form shares it. */
export const CATEGORY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Admin input for a Category. The slug is the Category's permanent link name; the API keeps it unique. */
export const categoryInputSchema = z.object({
  name: z.string().trim().min(1).max(CATEGORY_NAME_MAX_LENGTH),
  slug: z
    .string()
    .regex(CATEGORY_SLUG_PATTERN, 'Use lowercase letters, digits and single hyphens')
    .max(100),
});

/** Rename changes only the name: the slug stays, so shared links keep working. */
export const categoryRenameInputSchema = z.object({
  name: z.string().trim().min(1).max(CATEGORY_NAME_MAX_LENGTH),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;
export type CategoryRenameInput = z.infer<typeof categoryRenameInputSchema>;
