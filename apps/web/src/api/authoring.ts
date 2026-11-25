import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  authoringQuizPageSchema,
  authoringQuizSchema,
  quizIssueSchema,
  type AuthoringQuiz,
  type DraftQuiz,
  type QuizIssue,
} from '@yunakquiz/core';
import { z } from 'zod';
import { ApiError, get, request } from './client.ts';

/** Quiz authoring calls. Imported only by the Author screens, so Guests never download them (ADR 0004). */

const slugCheckSchema = z.object({ available: z.boolean() });

const quizPath = (slug: string) => `/authoring/quizzes/${encodeURIComponent(slug)}`;

export function useMyQuizzes(page: number) {
  return useQuery({
    queryKey: ['authoring', 'quizzes', page],
    queryFn: () => get(`/authoring/quizzes?page=${page}`, authoringQuizPageSchema),
    staleTime: 0,
    retry: false,
  });
}

export function useAuthoringQuiz(slug: string) {
  return useQuery({
    queryKey: ['authoring', 'quiz', slug],
    queryFn: () => get(quizPath(slug), authoringQuizSchema),
    enabled: slug !== '',
    staleTime: 0,
    retry: false,
  });
}

/** Whether `slug` is free. `currentSlug` lets an edited Quiz keep its own address. */
export function checkSlug(slug: string, currentSlug: string | undefined): Promise<boolean> {
  const query = currentSlug ? `?quiz=${encodeURIComponent(currentSlug)}` : '';
  return get(`/authoring/slugs/${encodeURIComponent(slug)}${query}`, slugCheckSchema).then(
    (result) => result.available,
  );
}

/** What a save sends: the draft content, plus the version the editor loaded when it is not new. */
export type SaveTarget = { slug: string; version: number } | undefined;

export function useAuthoringActions() {
  const queryClient = useQueryClient();

  const remember = (quiz: AuthoringQuiz) => {
    queryClient.setQueryData(['authoring', 'quiz', quiz.slug], quiz);
    void queryClient.invalidateQueries({ queryKey: ['authoring', 'quizzes'] });
    // A published Quiz is public, so the public views of it are stale too.
    void queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    void queryClient.invalidateQueries({ queryKey: ['categories'] });
    return quiz;
  };

  return {
    save: useMutation({
      mutationFn: ({ draft, target }: { draft: DraftQuiz; target: SaveTarget }) =>
        (target
          ? request('PUT', quizPath(target.slug), { ...draft, version: target.version })
          : request('POST', '/authoring/quizzes', draft)
        ).then((body) => remember(authoringQuizSchema.parse(body))),
    }),
    publish: useMutation({
      mutationFn: ({ slug, version }: { slug: string; version: number }) =>
        request('POST', `${quizPath(slug)}/publish`, { version }).then((body) =>
          remember(authoringQuizSchema.parse(body)),
        ),
    }),
    remove: useMutation({
      mutationFn: (slug: string) => request('DELETE', quizPath(slug)),
      onSuccess: (_, slug) => {
        queryClient.removeQueries({ queryKey: ['authoring', 'quiz', slug] });
        void queryClient.invalidateQueries({ queryKey: ['authoring', 'quizzes'] });
        void queryClient.invalidateQueries({ queryKey: ['quizzes'] });
        void queryClient.invalidateQueries({ queryKey: ['categories'] });
      },
    }),
  };
}

/** The issues a 422 `invalid_quiz` answer lists, or an empty list for any other error. */
export function invalidQuizIssues(error: unknown): QuizIssue[] {
  if (!(error instanceof ApiError) || error.code !== 'invalid_quiz') return [];
  const issues = (error.body as { issues?: unknown } | undefined)?.issues;
  const parsed = quizIssueSchema.array().safeParse(issues);
  return parsed.success ? parsed.data : [];
}
