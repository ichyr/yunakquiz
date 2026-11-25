import type { AdminUser } from '@yunakquiz/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { useAdminUsers, useChangeRole, useDeleteUser } from '@/api/admin';
import { ApiError } from '@/api/client';
import { AdminUserList, type AdminUserAction } from '@/components/AdminUserList';
import { ConfirmUserActionDialog } from '@/components/ConfirmUserActionDialog';
import { DocumentTitle } from '@/components/DocumentTitle';
import { LoadErrorState } from '@/components/LoadErrorState';
import { LoadingState } from '@/components/LoadingState';
import { PageTitle } from '@/components/PageTitle';

/** The Admin screen. Loaded as its own chunk, and only after the guard saw an Admin (ADR 0004). */
export default function AdminUsersPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const users = useAdminUsers({ q, page });
  const changeRole = useChangeRole();
  const deleteUser = useDeleteUser();
  const [pending, setPending] = useState<{ kind: AdminUserAction; user: AdminUser } | null>(null);
  const [failure, setFailure] = useState<string>();

  const busy = changeRole.isPending || deleteUser.isPending;

  function errorText(error: unknown) {
    if (error instanceof ApiError) {
      if (error.code === 'last_admin') return t('admin.errors.lastAdmin');
      if (error.code === 'target_unverified') return t('admin.errors.targetUnverified');
      if (error.status === 403) return t('admin.errors.forbidden');
      if (error.status === 404) return t('admin.errors.notFound');
    }
    return t('admin.errors.generic');
  }

  async function confirm() {
    if (!pending) return;
    const { kind, user } = pending;
    setFailure(undefined);
    try {
      if (kind === 'delete') await deleteUser.mutateAsync(user.id);
      else
        await changeRole.mutateAsync({ id: user.id, role: kind === 'promote' ? 'admin' : 'user' });
      setPending(null);
    } catch (error) {
      setFailure(errorText(error));
    }
  }

  function update(next: { q?: string; page?: number }) {
    const merged = { q, page, ...next };
    setParams({
      ...(merged.q && { q: merged.q }),
      ...(merged.page > 1 && { page: String(merged.page) }),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <DocumentTitle page={t('admin.title')} />
      <PageTitle>{t('admin.title')}</PageTitle>
      <Link to="/admin/categories" className="text-sm underline underline-offset-4">
        {t('admin.categoriesNav')}
      </Link>
      {users.data ? (
        <AdminUserList
          page={users.data}
          query={q}
          onSearch={(next) => update({ q: next, page: 1 })}
          onPageChange={(next) => update({ page: next })}
          onAction={(kind, user) => {
            setFailure(undefined);
            setPending({ kind, user });
          }}
        />
      ) : users.isError ? (
        <LoadErrorState onRetry={() => void users.refetch()} />
      ) : (
        <LoadingState />
      )}
      <ConfirmUserActionDialog
        action={pending && { kind: pending.kind, name: pending.user.displayName }}
        pending={busy}
        errorText={failure}
        onConfirm={() => void confirm()}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
