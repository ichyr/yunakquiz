import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { LanguageSwitcher } from './LanguageSwitcher.tsx';

export function AppLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="focus-ring flex flex-col rounded-sm">
            <span className="text-lg font-bold text-primary">{t('app.name')}</span>
            <span className="hidden text-xs text-muted-foreground sm:block">
              {t('app.tagline')}
            </span>
          </Link>
          <LanguageSwitcher />
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
