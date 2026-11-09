import { useTranslation } from 'react-i18next';
import { ErrorState } from '@/components/ErrorState';

export function NotFoundPage() {
  const { t } = useTranslation();
  return <ErrorState notFound title={t('status.pageNotFound')} />;
}
