import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import {
  useAdminCategories,
  useCreateCategory,
  useDeleteCategory,
  useRenameCategory,
  type AdminCategory,
} from '@/api/admin-categories';
import { ApiError } from '@/api/client';
import { AdminCategoryList } from '@/components/AdminCategoryList';
import { CategoryForm } from '@/components/CategoryForm';
import { ConfirmCategoryDeleteDialog } from '@/components/ConfirmCategoryDeleteDialog';
import { DocumentTitle } from '@/components/DocumentTitle';
import { LoadErrorState } from '@/components/LoadErrorState';
import { LoadingState } from '@/components/LoadingState';
import { PageTitle } from '@/components/PageTitle';

/** The Admin Category screen. Its own chunk, loaded only after AdminGate saw an Admin (ADR 0004). */
export default function AdminCategoriesPage() {
  const { t } = useTranslation();
  const categories = useAdminCategories();
  const create = useCreateCategory();
  const rename = useRenameCategory();
  const remove = useDeleteCategory();
  const [renaming, setRenaming] = useState<AdminCategory | null>(null);
  const [deleting, setDeleting] = useState<AdminCategory | null>(null);
  const [failure, setFailure] = useState<string>();
  const [deleteFailure, setDeleteFailure] = useState<string>();
  const [saved, setSaved] = useState(false);

  function errorText(error: unknown) {
    if (error instanceof ApiError) {
      if (error.code === 'slug_taken') return t('admin.categories.errors.slugTaken');
      if (error.status === 404) return t('admin.categories.errors.notFound');
      if (error.status === 403) return t('admin.categories.errors.forbidden');
    }
    return t('admin.categories.errors.generic');
  }

  async function submitCreate(input: { name: string; slug: string }) {
    setFailure(undefined);
    setSaved(false);
    try {
      await create.mutateAsync(input);
      setSaved(true);
    } catch (error) {
      setFailure(errorText(error));
    }
  }

  async function submitRename(name: string) {
    if (!renaming) return;
    setFailure(undefined);
    setSaved(false);
    try {
      await rename.mutateAsync({ id: renaming.id, name });
      setRenaming(null);
      setSaved(true);
    } catch (error) {
      setFailure(errorText(error));
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteFailure(undefined);
    try {
      await remove.mutateAsync(deleting.id);
      setDeleting(null);
      setSaved(false);
    } catch (error) {
      setDeleteFailure(errorText(error));
    }
  }

  const busy = create.isPending || rename.isPending || remove.isPending;

  return (
    <div className="flex flex-col gap-6">
      <DocumentTitle page={t('admin.categories.title')} />
      <PageTitle>{t('admin.categories.title')}</PageTitle>
      <Link to="/admin/users" className="text-sm underline underline-offset-4">
        {t('admin.categories.accountsNav')}
      </Link>

      <section aria-labelledby="category-form-heading" className="flex flex-col gap-3">
        <h2 id="category-form-heading" className="text-lg font-semibold">
          {renaming ? t('admin.categories.rename') : t('admin.categories.add')}
        </h2>
        {renaming ? (
          <CategoryForm
            key={renaming.id}
            mode="rename"
            defaultName={renaming.name}
            pending={busy}
            errorText={failure}
            onSubmit={(input) => void submitRename(input.name)}
            onCancel={() => {
              setRenaming(null);
              setFailure(undefined);
            }}
          />
        ) : (
          <CategoryForm
            key="create"
            mode="create"
            pending={busy}
            errorText={failure}
            onSubmit={(input) => void submitCreate(input)}
          />
        )}
        {saved && (
          <output className="block text-sm text-muted-foreground">
            {t('admin.categories.saved')}
          </output>
        )}
      </section>

      {categories.data ? (
        <AdminCategoryList
          categories={categories.data}
          onRename={(category) => {
            setFailure(undefined);
            setSaved(false);
            setRenaming(category);
          }}
          onDelete={(category) => {
            setDeleteFailure(undefined);
            setDeleting(category);
          }}
        />
      ) : categories.isError ? (
        <LoadErrorState onRetry={() => void categories.refetch()} />
      ) : (
        <LoadingState />
      )}

      <ConfirmCategoryDeleteDialog
        category={deleting}
        pending={remove.isPending}
        errorText={deleteFailure}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
