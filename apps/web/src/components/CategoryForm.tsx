import {
  CATEGORY_NAME_MAX_LENGTH,
  CATEGORY_SLUG_PATTERN,
  type CategoryInput,
} from '@yunakquiz/core';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface CategoryFormProps {
  /** `create` asks for name and address; `rename` changes the name only. */
  mode: 'create' | 'rename';
  defaultName?: string;
  pending?: boolean;
  /** Why the last save failed, shown above the buttons. */
  errorText?: string | undefined;
  onSubmit: (input: CategoryInput) => void;
  /** Shown when renaming, to leave the form without saving. */
  onCancel?: () => void;
}

/** Create or rename a Category. Messages come from i18n; the API still checks the slug is free. */
export function CategoryForm({
  mode,
  defaultName = '',
  pending = false,
  errorText,
  onSubmit,
  onCancel,
}: CategoryFormProps) {
  const { t } = useTranslation();
  const form = useForm<CategoryInput>({
    defaultValues: { name: defaultName, slug: '' },
  });

  const nameRules = {
    validate: (value: string) => {
      if (value.trim() === '') return t('admin.categories.errors.nameRequired');
      if (value.trim().length > CATEGORY_NAME_MAX_LENGTH)
        return t('admin.categories.errors.nameTooLong');
      return true;
    },
  };
  const slugRules = {
    validate: (value: string) =>
      CATEGORY_SLUG_PATTERN.test(value) || t('admin.categories.errors.slugInvalid'),
  };

  return (
    <Form {...form}>
      <form
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit((values) =>
          onSubmit({ name: values.name.trim(), slug: mode === 'create' ? values.slug : '' }),
        )}
        noValidate
      >
        <FormField
          control={form.control}
          name="name"
          rules={nameRules}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('admin.categories.nameLabel')}</FormLabel>
              <FormControl>
                <Input autoComplete="off" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {mode === 'create' && (
          <FormField
            control={form.control}
            name="slug"
            rules={slugRules}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('admin.categories.slugLabel')}</FormLabel>
                <FormControl>
                  <Input autoComplete="off" spellCheck={false} {...field} />
                </FormControl>
                <FormDescription>{t('admin.categories.slugHint')}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {errorText && (
          <p role="alert" className="text-sm text-destructive">
            {errorText}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            {pending
              ? t('admin.categories.working')
              : mode === 'create'
                ? t('admin.categories.create')
                : t('admin.categories.save')}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
              {t('admin.categories.cancel')}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
