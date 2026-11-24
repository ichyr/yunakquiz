import { useTranslation } from 'react-i18next';
import { PageMessage } from './PageMessage.tsx';

/**
 * A load paused while offline. No Retry: loading resumes by itself on reconnect.
 * Pages show it only while they have no data, so cached content always wins over it.
 */
export function OfflineState() {
  const { t } = useTranslation();
  return (
    <PageMessage title={t('status.offlineTitle')} description={t('status.offlineDescription')} />
  );
}
