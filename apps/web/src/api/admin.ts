import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminUserPageSchema, type Role } from '@yunakquiz/core';
import { get, request } from './client.ts';

/** Admin calls. Imported only by the Admin screens, so Guests never download them (ADR 0004). */

export function useAdminUsers({ q, page }: { q: string; page: number }) {
  return useQuery({
    queryKey: ['admin', 'users', q, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), ...(q && { q }) });
      return get(`/admin/users?${params}`, adminUserPageSchema);
    },
    // Keep the old page on screen while the next one loads.
    placeholderData: keepPreviousData,
    // An Admin list is never worth showing stale after an action.
    staleTime: 0,
    retry: false,
  });
}

export function useChangeRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: number; role: Role }) =>
      request('PATCH', `/admin/users/${id}/role`, { role }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => request('DELETE', `/admin/users/${id}`),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}
