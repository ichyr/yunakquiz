import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchCategories,
  fetchCategory,
  fetchMe,
  fetchQuiz,
  isNotFound,
  login,
  logout,
  register,
  searchQuizzes,
  verifyEmail,
} from './client.ts';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60_000,
        // The default `online` network mode: offline, a query pauses instead of failing, and
        // resumes on reconnect. QueryFallback shows OfflineState while it is paused.
        networkMode: 'online',
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

/** Who is signed in: the Account, null for a Guest, or a `session_expired` error. One call for the whole app. */
export function useMe() {
  return useQuery({ queryKey: ['me'], queryFn: fetchMe, retry: false });
}

export function useRegister() {
  return useMutation({ mutationFn: register });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: login,
    onSuccess: (account) => queryClient.setQueryData(['me'], account),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    // Settled either way: a failed logout must not leave the UI claiming a session it dropped.
    onSettled: () => queryClient.setQueryData(['me'], null),
  });
}

/** Spends the mailed token once. A query, so React StrictMode's second render reuses the first call. */
export function useVerifyEmail(token: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ['verify', token],
    queryFn: async () => {
      await verifyEmail(token);
      void queryClient.invalidateQueries({ queryKey: ['me'] });
      return true;
    },
    enabled: token !== '',
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
