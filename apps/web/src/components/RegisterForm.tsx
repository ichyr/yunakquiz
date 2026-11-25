import { zodResolver } from '@hookform/resolvers/zod';
import { registerInputSchema, validatePassword, type RegisterInput } from '@yunakquiz/core';
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

/** The core schema, plus the password rules, which need the email and name typed beside it. */
const formSchema = registerInputSchema.superRefine((values, context) => {
  const result = validatePassword(values.password, {
    email: values.email,
    name: values.displayName,
  });
  if (result.ok) return;
  for (const issue of result.issues) {
    context.addIssue({ code: 'custom', path: ['password'], message: issue });
  }
});

interface RegisterFormProps {
  /** Rejects with an `ApiError` when the API refuses; the form shows why. */
  onSubmit: (input: RegisterInput) => Promise<void>;
  interfaceLanguage: RegisterInput['interfaceLanguage'];
}

export function RegisterForm({ onSubmit, interfaceLanguage }: RegisterFormProps) {
  const { t } = useTranslation();
  const errorText = useAuthErrorText();
  const [formError, setFormError] = useState<string>();
  const form = useForm<RegisterInput>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', displayName: '', password: '', interfaceLanguage },
  });

  async function submit(values: RegisterInput) {
    setFormError(undefined);
    try {
      await onSubmit({ ...values, interfaceLanguage });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'display_name_taken') {
        form.setError('displayName', { message: 'display_name_taken' });
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
        <FormField
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>{t('auth.password')}</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormDescription>{t('auth.passwordHint')}</FormDescription>
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
          {form.formState.isSubmitting ? t('auth.working') : t('auth.register')}
        </Button>
      </form>
    </Form>
  );
}
