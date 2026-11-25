import {
  canChangeRole,
  canDeleteUser,
  type Actor,
  type AdminUser,
  type AdminUserPage,
} from '@yunakquiz/core';
import { SearchIcon } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export type AdminUserAction = 'promote' | 'demote' | 'delete';

interface AdminUserListProps {
  page: AdminUserPage;
  /** The search text in the address. */
  query: string;
  onSearch: (query: string) => void;
  onPageChange: (page: number) => void;
  onAction: (action: AdminUserAction, user: AdminUser) => void;
}

/**
 * The Admin's table of Accounts. Controls the Admin may not use are hidden with the same
 * permission functions the API enforces; the API is what actually refuses.
 */
export function AdminUserList({
  page,
  query,
  onSearch,
  onPageChange,
  onAction,
}: AdminUserListProps) {
  const { t, i18n } = useTranslation();
  const [text, setText] = useState(query);
  const actor: Actor = { id: page.actorId, role: 'admin', verified: true };
  const pages = Math.max(1, Math.ceil(page.total / page.pageSize));
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch(text.trim());
  }

  return (
    <div className="flex flex-col gap-4">
      <search>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            type="search"
            name="q"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t('admin.search.placeholder')}
            aria-label={t('admin.search.label')}
          />
          <Button type="submit">
            <SearchIcon aria-hidden />
            <span className="sr-only sm:not-sr-only">{t('admin.search.submit')}</span>
          </Button>
        </form>
      </search>

      <output className="block text-sm text-muted-foreground">
        {t('admin.summary', { count: page.total })}
      </output>

      {page.items.length === 0 ? (
        <p className="rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
          {t('admin.empty')}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-176 text-left text-sm">
            <thead className="border-b bg-secondary text-xs uppercase">
              <tr>
                {(
                  ['name', 'email', 'role', 'verified', 'created', 'quizzes', 'actions'] as const
                ).map((column) => (
                  <th key={column} scope="col" className="px-3 py-2 font-medium">
                    {t(`admin.columns.${column}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {page.items.map((user) => {
                const canPromote = canChangeRole(actor, user, 'admin', page.adminCount);
                const canDemote = canChangeRole(actor, user, 'user', page.adminCount);
                const canDelete = canDeleteUser(actor, user, page.adminCount);
                return (
                  <tr key={user.id} className="border-b last:border-b-0">
                    <th scope="row" className="px-3 py-2 font-medium">
                      {user.displayName}
                    </th>
                    <td className="px-3 py-2 break-all">{user.email}</td>
                    <td className="px-3 py-2">{t(`admin.roles.${user.role}`)}</td>
                    <td className="px-3 py-2">
                      {user.verified ? t('admin.verified.yes') : t('admin.verified.no')}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {date.format(new Date(user.createdAt))}
                    </td>
                    <td className="px-3 py-2">{user.quizCount}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {canPromote && (
                          <Button
                            size="sm"
                            variant="outline"
                            aria-label={t('admin.actions.promoteFor', { name: user.displayName })}
                            onClick={() => onAction('promote', user)}
                          >
                            {t('admin.actions.promote')}
                          </Button>
                        )}
                        {canDemote && (
                          <Button
                            size="sm"
                            variant="outline"
                            aria-label={t('admin.actions.demoteFor', { name: user.displayName })}
                            onClick={() => onAction('demote', user)}
                          >
                            {t('admin.actions.demote')}
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            aria-label={t('admin.actions.deleteFor', { name: user.displayName })}
                            onClick={() => onAction('delete', user)}
                          >
                            {t('admin.actions.delete')}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav aria-label={t('admin.pagination.label')} className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page.page <= 1}
            onClick={() => onPageChange(page.page - 1)}
          >
            {t('admin.pagination.previous')}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t('admin.pagination.page', { page: page.page, pages })}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page.page >= pages}
            onClick={() => onPageChange(page.page + 1)}
          >
            {t('admin.pagination.next')}
          </Button>
        </nav>
      )}
    </div>
  );
}
