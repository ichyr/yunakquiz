import { zodResolver } from '@hookform/resolvers/zod';
import { deleteAccountInputSchema, type DeleteAccountInput } from '@yunakquiz/core';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ApiError } from '@/api/client';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuthErrorText } from '@/lib/useAuthErrorText';

interface DeleteAccountSectionProps {
  /** Rejects with an `ApiError` when the API refuses; the dialog shows why. */
  onDelete: (input: DeleteAccountInput) => Promise<void>;
  /** Start with the confirmation open (Storybook). */
  defaultOpen?: boolean;
}

/** The delete action: a button that opens a confirmation asking for the current password. */
export function DeleteAccountSection({ onDelete, defaultOpen = false }: DeleteAccountSectionProps) {
  const { t } = useTranslation();
  const errorText = useAuthErrorText();
  const [formError, setFormError] = useState<string>();
  const form = useForm<DeleteAccountInput>({
    resolver: zodResolver(deleteAccountInputSchema),
    defaultValues: { currentPassword: '' },
  });

  async function submit(values: DeleteAccountInput) {
    setFormError(undefined);
    try {
      await onDelete(values);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'invalid_current_password') {
        form.setError('currentPassword', { message: 'invalid_current_password' });
      } else if (error instanceof ApiError && error.code === 'last_admin') {
        setFormError(t('account.delete.lastAdmin'));
      } else {
        setFormError(errorText(error));
      }
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{t('account.delete.description')}</p>
      <AlertDialog defaultOpen={defaultOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="self-start">
            {t('account.delete.open')}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('account.delete.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('account.delete.confirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} noValidate className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>{t('account.currentPassword')}</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormMessage>{fieldState.error && errorText(fieldState.error)}</FormMessage>
                  </FormItem>
                )}
              />
              {formError && (
                <p role="alert" className="text-sm text-destructive">
                  {formError}
                </p>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel>{t('account.delete.cancel')}</AlertDialogCancel>
                <Button type="submit" variant="destructive" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? t('auth.working') : t('account.delete.submit')}
                </Button>
              </AlertDialogFooter>
            </form>
          </Form>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
