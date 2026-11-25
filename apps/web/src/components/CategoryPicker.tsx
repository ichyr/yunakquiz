import type { Category, DraftQuizInput } from '@yunakquiz/core';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FormField } from '@/components/ui/form';
import { useIssueText } from '@/lib/useIssueText';

interface CategoryPickerProps {
  categories: Pick<Category, 'slug' | 'name'>[];
}

/** One or more existing Categories, as checkboxes. Authors cannot add Categories; Admins do. */
export function CategoryPicker({ categories }: CategoryPickerProps) {
  const { t } = useTranslation();
  const issueText = useIssueText();
  const form = useFormContext<DraftQuizInput>();

  return (
    <FormField
      control={form.control}
      name="categories"
      render={({ field, fieldState }) => {
        const selected = field.value ?? [];
        return (
          <fieldset className="flex flex-col gap-2" aria-describedby="categories-hint">
            <legend className="text-sm font-medium">{t('author.editor.fields.categories')}</legend>
            <p id="categories-hint" className="text-sm text-muted-foreground">
              {categories.length === 0
                ? t('author.editor.fields.categoriesEmpty')
                : t('author.editor.fields.categoriesHint')}
            </p>
            <ul className="grid gap-1">
              {categories.map((category) => (
                <li key={category.slug}>
                  <label className="flex min-h-11 items-center gap-3 rounded-md px-1">
                    <input
                      type="checkbox"
                      className="size-5 accent-primary"
                      checked={selected.includes(category.slug)}
                      onChange={(event) =>
                        field.onChange(
                          event.target.checked
                            ? [...selected, category.slug]
                            : selected.filter((slug) => slug !== category.slug),
                        )
                      }
                    />
                    <span>{category.name}</span>
                  </label>
                </li>
              ))}
            </ul>
            {fieldState.error && (
              <p role="alert" className="text-sm text-destructive">
                {issueText('categories')}
              </p>
            )}
          </fieldset>
        );
      }}
    />
  );
}
