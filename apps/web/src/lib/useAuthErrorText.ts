import type { FieldError } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ApiError } from '@/api/client';

const passwordIssues = [
  'too_short',
  'too_long',
  'common',
  'contains_email',
  'contains_name',
  'sequence',
  'repeat',
] as const;

/**
 * Turns an API error or a form field error into text in the Interface Language. Field errors
 * carry either a password rule code from core, an API code, or a zod issue for email or name.
 */
export function useAuthErrorText() {
  const { t } = useTranslation();

  return (error: unknown): string => {
    if (error instanceof ApiError) {
      if (error.code === 'invalid_credentials') return t('auth.errors.invalidCredentials');
      if (error.code === 'display_name_taken') return t('auth.errors.displayNameTaken');
      if (error.code === 'invalid_current_password') return t('account.errors.wrongPassword');
      if (error.status === 429) return t('auth.errors.tooManyRequests');
      return t('auth.errors.generic');
    }
    const { message, ref } = (error ?? {}) as Partial<FieldError>;
    const code = passwordIssues.find((issue) => issue === message);
    if (code) return t(`auth.passwordIssues.${code}`);
    if (message === 'invalid_current_password') return t('account.errors.wrongPassword');
    if (message === 'display_name_taken') return t('auth.errors.displayNameTaken');
    const field = (ref as { name?: string } | undefined)?.name;
    if (field === 'email') return t('auth.errors.email');
    if (field === 'newEmail') return t('auth.errors.email');
    if (field === 'displayName') return t('auth.errors.displayName');
    if (message) return t('auth.errors.required');
    return t('auth.errors.generic');
  };
}
