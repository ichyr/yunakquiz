import { zodResolver } from '@hookform/resolvers/zod';
import { changeEmailInputSchema, type ChangeEmailInput } from '@yunakquiz/core';
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

interface ChangeEmailFormProps {
  currentEmail: string;
  /** Rejects with an `ApiError` when the API refuses; the form shows why. */
  onSubmit: (input: ChangeEmailInput) => Promise<void>;
}

/** The API answers the same whether or not the new address has an Account, so the form only says a mail was sent. */
export function ChangeEmailForm({ currentEmail, onSubmit }: ChangeEmailFormProps) {
  const { t } = useTranslation();
  const errorText = useAuthErrorText();
  const [formError, setFormError] = useState<string>();
  const [sent, setSent] = useState(false);
  const form = useForm<ChangeEmailInput>({
    resolver: zodResolver(changeEmailInputSchema),
    defaultValues: { newEmail: '', currentPassword: '' },
  });

  async function submit(values: ChangeEmailInput) {
    setFormError(undefined);
    setSent(false);
    try {
      await onSubmit(values);
      setSent(true);
      form.reset();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'invalid_current_password') {
        form.setError('currentPassword', { message: 'invalid_current_password' });
      } else {
        setFormError(errorText(error));
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} noValidate className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {t('account.email.current', { email: currentEmail })}
        </p>
        <FormField
          control={form.control}
          name="newEmail"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>{t('account.email.new')}</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" {...field} />
              </FormControl>
              <FormDescription>{t('account.email.hint')}</FormDescription>
              <FormMessage>{fieldState.error && errorText(fieldState.error)}</FormMessage>
            </FormItem>
          )}
        />
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
        {sent && <output className="block text-sm">{t('account.email.sent')}</output>}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? t('auth.working') : t('account.email.submit')}
        </Button>
      </form>
    </Form>
  );
}
