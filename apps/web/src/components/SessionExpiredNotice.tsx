import type { LoginInput } from '@yunakquiz/core';
import { useTranslation } from 'react-i18next';
import { LoginForm } from './LoginForm.tsx';

interface SessionExpiredNoticeProps {
  /** Logs in; the editor retries the failed save when it resolves. Rejects with an `ApiError`. */
  onLogin: (input: LoginInput) => Promise<void>;
}

/** The session ended during editing (401). The form content is still in memory; log in and retry. */
export function SessionExpiredNotice({ onLogin }: SessionExpiredNoticeProps) {
  const { t } = useTranslation();
  return (
    <section
      role="alert"
      aria-labelledby="session-expired-title"
      className="flex flex-col gap-3 rounded-lg border border-destructive/50 bg-destructive/5 p-4"
    >
      <h2 id="session-expired-title" className="font-medium">
        {t('author.editor.sessionExpired.title')}
      </h2>
      <p className="text-sm">{t('author.editor.sessionExpired.description')}</p>
      <LoginForm onSubmit={onLogin} />
    </section>
  );
}
