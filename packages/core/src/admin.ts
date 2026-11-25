import { z } from 'zod';
import { roleSchema } from './account.ts';

export const ADMIN_USERS_PAGE_SIZE = 20;
export const ADMIN_SEARCH_MAX_LENGTH = 100;

/** Query of the Admin Account list. Search matches display name or email. */
export const adminUserListQuerySchema = z.object({
  q: z.string().trim().max(ADMIN_SEARCH_MAX_LENGTH).optional(),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
});

export const roleChangeInputSchema = z.object({ role: roleSchema });

/** One row of the Admin Account list. Never contains the hash. */
export const adminUserSchema = z.object({
  id: z.number().int(),
  email: z.string(),
  displayName: z.string(),
  role: roleSchema,
  verified: z.boolean(),
  createdAt: z.string(),
  /** Quizzes the Account wrote, drafts included. */
  quizCount: z.number().int(),
});

export const adminUserPageSchema = z.object({
  items: z.array(adminUserSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  /** Admins right now, so the web app can hide controls on the last one. */
  adminCount: z.number().int(),
  /** The requesting Admin, so the web app can build the actor for the permission functions. */
  actorId: z.number().int(),
});

export type AdminUser = z.infer<typeof adminUserSchema>;
export type AdminUserPage = z.infer<typeof adminUserPageSchema>;
