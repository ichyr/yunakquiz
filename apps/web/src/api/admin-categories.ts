import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import type { CategoryInput, CategoryRenameInput } from '@yunakquiz/core';
import { request, get } from './client.ts';

/** Admin Category calls. Imported only by the Admin screens, so Guests never download them (ADR 0004). */

const adminCategorySchema = z.object({
  id: z.number().int(),
  slug: z.string(),
  name: z.string(),
});
const adminCategoriesSchema = z.array(adminCategorySchema);

export type AdminCategory = z.infer<typeof adminCategorySchema>;

export function useAdminCategories() {
  return useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => get('/admin/categories', adminCategoriesSchema),
    staleTime: 0,
    retry: false,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CategoryInput) => request('POST', '/admin/categories', input),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] }),
  });
}

export function useRenameCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: number } & CategoryRenameInput) =>
      request('PATCH', `/admin/categories/${id}`, input),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] }),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => request('DELETE', `/admin/categories/${id}`),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] }),
  });
}
