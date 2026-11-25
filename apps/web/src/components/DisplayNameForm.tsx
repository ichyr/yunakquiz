import { zodResolver } from '@hookform/resolvers/zod';
import { changeDisplayNameInputSchema, type ChangeDisplayNameInput } from '@yunakquiz/core';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ApiError } from '@/api/client';
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
import { useAuthErrorText } from '@/lib/useAuthErrorText';

interface DisplayNameFormProps {
  currentName: string;
  /** Rejects with an `ApiError` when the API refuses; the form shows why. */
  onSubmit: (input: ChangeDisplayNameInput) => Promise<void>;
}

export function DisplayNameForm({ currentName, onSubmit }: DisplayNameFormProps) {
  const { t } = useTranslation();
  const errorText = useAuthErrorText();
  const [formError, setFormError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const form = useForm<ChangeDisplayNameInput>({
    resolver: zodResolver(changeDisplayNameInputSchema),
    defaultValues: { displayName: currentName },
  });

  async function submit(values: ChangeDisplayNameInput) {
    setFormError(undefined);
    setSaved(false);
    try {
      await onSubmit(values);
      setSaved(true);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'display_name_taken') {
        form.setError('displayName', { message: 'display_name_taken' });
      } else {
        setFormError(errorText(error));
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} noValidate className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="displayName"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>{t('auth.displayName')}</FormLabel>
              <FormControl>
                <Input autoComplete="nickname" {...field} />
              </FormControl>
              <FormDescription>{t('auth.displayNameHint')}</FormDescription>
              <FormMessage>{fieldState.error && errorText(fieldState.error)}</FormMessage>
            </FormItem>
          )}
        />
        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        )}
        {saved && <output className="block text-sm">{t('account.displayName.saved')}</output>}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? t('auth.working') : t('account.displayName.submit')}
        </Button>
      </form>
    </Form>
  );
}
