import { zodResolver } from '@hookform/resolvers/zod';
import { requestResetInputSchema, type RequestResetInput } from '@yunakquiz/core';
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

interface ForgotPasswordFormProps {
  /** Rejects with an `ApiError` when the API refuses (a rate limit, say). */
  onSubmit: (input: RequestResetInput) => Promise<void>;
}

/** Asks for the email only. The answer is the same whether or not an Account exists. */
export function ForgotPasswordForm({ onSubmit }: ForgotPasswordFormProps) {
  const { t } = useTranslation();
  const errorText = useAuthErrorText();
  const [formError, setFormError] = useState<string>();
  const form = useForm<RequestResetInput>({
    resolver: zodResolver(requestResetInputSchema),
    defaultValues: { email: '' },
  });

  async function submit(values: RequestResetInput) {
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
        <p className="text-sm text-muted-foreground">{t('passwordReset.requestIntro')}</p>
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
        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        )}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? t('auth.working') : t('passwordReset.requestSubmit')}
        </Button>
      </form>
    </Form>
  );
}
