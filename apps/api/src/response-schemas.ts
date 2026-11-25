import {
  categorySchema,
  categoryWithQuizzesSchema,
  quizViewSchema,
  quizSummarySchema,
} from '@yunakquiz/core';
import { z } from 'zod';

/** The API error shape. Declared so handlers can type their 400 and 404 replies. */
const errorSchema = {
  type: 'object',
  properties: { error: { type: 'string' } },
  required: ['error'],
} as const;

/**
 * Turns a core zod schema into the JSON Schema Fastify uses to serialize a 200 response.
 * Fastify serializes with fast-json-stringify, which is faster than JSON.stringify and
 * drops any property the schema does not list. Validation keywords are ignored.
 *
 * `unrepresentable: 'any'` is needed because the Quiz `language` schema has a transform
 * (it canonicalizes the tag), which has no JSON Schema form. That one property becomes
 * `{}` and is serialized as is.
 */
function responseSchema(schema: z.ZodType) {
  const { $schema: _ignored, ...jsonSchema } = z.toJSONSchema(schema, {
    io: 'output',
    target: 'draft-7',
    unrepresentable: 'any',
  });
  return { 200: jsonSchema, 400: errorSchema, 404: errorSchema };
}

export const categoriesResponse = responseSchema(z.array(categorySchema));
export const categoryResponse = responseSchema(categoryWithQuizzesSchema);
export const quizSummariesResponse = responseSchema(z.array(quizSummarySchema));
export const quizResponse = responseSchema(quizViewSchema);
