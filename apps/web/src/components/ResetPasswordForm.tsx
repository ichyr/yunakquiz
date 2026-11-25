import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordInputSchema } from '@yunakquiz/core';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { z } from 'zod';
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

const formSchema = resetPasswordInputSchema.pick({ password: true });
type FormValues = z.input<typeof formSchema>;

interface ResetPasswordFormProps {
  /**
   * Rejects with an `ApiError` when the API refuses. The password rules need the Account's
   * email and name, which only the API knows, so it judges the password and the form shows why.
   */
  onSubmit: (password: string) => Promise<void>;
}

export function ResetPasswordForm({ onSubmit }: ResetPasswordFormProps) {
  const { t } = useTranslation();
  const errorText = useAuthErrorText();
  const [formError, setFormError] = useState<string>();
  const [badLink, setBadLink] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: '' },
  });

  async function submit({ password }: FormValues) {
    setFormError(undefined);
    setBadLink(false);
    try {
      await onSubmit(password);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'invalid_token') {
        setBadLink(true);
      } else if (error instanceof ApiError && error.code === 'invalid_password') {
        form.setError('password', { message: error.issues[0] ?? 'invalid_password' });
      } else {
        setFormError(errorText(error));
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} noValidate className="flex flex-col gap-5">
        <FormField
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>{t('passwordReset.newPassword')}</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormDescription>{t('auth.passwordHint')}</FormDescription>
              <FormMessage>{fieldState.error && errorText(fieldState.error)}</FormMessage>
            </FormItem>
          )}
        />
        {badLink && (
          <p role="alert" className="text-sm text-destructive">
            {t('passwordReset.invalidToken')}{' '}
            <Link to="/reset-password" className="focus-ring rounded-sm underline">
              {t('passwordReset.askAgain')}
            </Link>
          </p>
        )}
        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        )}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? t('auth.working') : t('passwordReset.completeSubmit')}
        </Button>
      </form>
    </Form>
  );
}
