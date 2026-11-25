import { useTranslation } from 'react-i18next';
import type { AdminCategory } from '@/api/admin-categories';
import { Button } from '@/components/ui/button';

interface AdminCategoryListProps {
  categories: AdminCategory[];
  onRename: (category: AdminCategory) => void;
  onDelete: (category: AdminCategory) => void;
}

/** The Admin's table of Categories, with a rename and a delete action per row. */
export function AdminCategoryList({ categories, onRename, onDelete }: AdminCategoryListProps) {
  const { t } = useTranslation();

  if (categories.length === 0) {
    return (
      <p className="rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
        {t('admin.categories.empty')}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-120 text-left text-sm">
        <thead className="border-b bg-secondary text-xs uppercase">
          <tr>
            {(['name', 'slug', 'actions'] as const).map((column) => (
              <th key={column} scope="col" className="px-3 py-2 font-medium">
                {t(`admin.categories.columns.${column}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <tr key={category.id} className="border-b last:border-b-0">
              <th scope="row" className="px-3 py-2 font-medium">
                {category.name}
              </th>
              <td className="px-3 py-2 break-all text-muted-foreground">{category.slug}</td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={t('admin.categories.renameFor', { name: category.name })}
                    onClick={() => onRename(category)}
                  >
                    {t('admin.categories.rename')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    aria-label={t('admin.categories.removeFor', { name: category.name })}
                    onClick={() => onDelete(category)}
                  >
                    {t('admin.categories.remove')}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
