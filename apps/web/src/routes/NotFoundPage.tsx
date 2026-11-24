import { useTranslation } from 'react-i18next';
import { NotFoundState } from '@/components/NotFoundState';

export function NotFoundPage() {
  const { t } = useTranslation();
  return <NotFoundState title={t('status.pageNotFound')} />;
}
