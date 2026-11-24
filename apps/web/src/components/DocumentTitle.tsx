import { useTranslation } from 'react-i18next';

/**
 * The browser tab, history and shared-link title: `{page} · Yunakquiz`, or the app name alone
 * when there is no page name. Separate from `PageTitle`, the visible `h1`.
 */
export function DocumentTitle({ page }: { page?: string | undefined }) {
  const { t } = useTranslation();
  const name = t('app.name');
  return <title>{page ? `${page} · ${name}` : name}</title>;
}
