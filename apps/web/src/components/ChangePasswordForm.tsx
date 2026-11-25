import { zodResolver } from '@hookform/resolvers/zod';
import {
  changePasswordInputSchema,
  validatePassword,
  type ChangePasswordInput,
} from '@yunakquiz/core';
import { useMemo, useState } from 'react';
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

interface ChangePasswordFormProps {
  /** The password rules compare the new password with these. */
  email: string;
  displayName: string;
  /** Rejects with an `ApiError` when the API refuses; the form shows why. */
  onSubmit: (input: ChangePasswordInput) => Promise<void>;
}

export function ChangePasswordForm({ email, displayName, onSubmit }: ChangePasswordFormProps) {
  const { t } = useTranslation();
  const errorText = useAuthErrorText();
  const [formError, setFormError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const schema = useMemo(
    () =>
      changePasswordInputSchema.superRefine((values, context) => {
        const result = validatePassword(values.newPassword, { email, name: displayName });
        if (result.ok) return;
        for (const issue of result.issues) {
          context.addIssue({ code: 'custom', path: ['newPassword'], message: issue });
        }
      }),
    [email, displayName],
  );
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '' },
  });

  async function submit(values: ChangePasswordInput) {
    setFormError(undefined);
    setSaved(false);
    try {
      await onSubmit(values);
      setSaved(true);
      form.reset();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'invalid_current_password') {
        form.setError('currentPassword', { message: 'invalid_current_password' });
      } else if (error instanceof ApiError && error.code === 'invalid_password') {
        form.setError('newPassword', { message: error.issues[0] ?? 'invalid_password' });
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
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>{t('account.newPassword')}</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormDescription>{t('auth.passwordHint')}</FormDescription>
              <FormMessage>{fieldState.error && errorText(fieldState.error)}</FormMessage>
            </FormItem>
          )}
        />
        <p className="text-sm text-muted-foreground">{t('account.password.hint')}</p>
        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        )}
        {saved && <output className="block text-sm">{t('account.password.saved')}</output>}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? t('auth.working') : t('account.password.submit')}
        </Button>
      </form>
    </Form>
  );
}
