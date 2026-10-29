import { QueryClient, useQuery } from '@tanstack/react-query';
import { fetchCategories, fetchCategory, fetchQuiz, isNotFound, searchQuizzes } from './client.ts';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60_000,
        // A 404 won't fix itself; anything else gets the usual retries.
        retry: (failureCount, error) => !isNotFound(error) && failureCount < 3,
      },
    },
  });
}

export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: fetchCategories });
}

export function useCategory(slug: string) {
  return useQuery({ queryKey: ['categories', slug], queryFn: () => fetchCategory(slug) });
}

/** The API rejects a blank query, so a blank one is never sent. */
export function useQuizSearch(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: ['quizzes', 'search', q],
    queryFn: () => searchQuizzes(q),
    enabled: q !== '',
  });
}

export function useQuiz(slug: string) {
  return useQuery({ queryKey: ['quizzes', slug], queryFn: () => fetchQuiz(slug) });
}
