import { zodResolver } from '@hookform/resolvers/zod';
import { loginInputSchema, type LoginInput } from '@yunakquiz/core';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
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

interface LoginFormProps {
  /** Rejects with an `ApiError` when the API refuses; the form shows why. */
  onSubmit: (input: LoginInput) => Promise<void>;
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  const { t } = useTranslation();
  const errorText = useAuthErrorText();
  const [formError, setFormError] = useState<string>();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginInputSchema),
    defaultValues: { email: '', password: '' },
  });

  async function submit(values: LoginInput) {
    setFormError(undefined);
    try {
      await onSubmit(values);
    } catch (error) {
      setFormError(errorText(error));
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} noValidate className="flex flex-col gap-5">
        <FormField
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>{t('auth.email')}</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage>{fieldState.error && errorText(fieldState.error)}</FormMessage>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>{t('auth.password')}</FormLabel>
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
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? t('auth.working') : t('auth.login')}
        </Button>
      </form>
    </Form>
  );
}
