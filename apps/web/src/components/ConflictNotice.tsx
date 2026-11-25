import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface ConflictNoticeProps {
  pending?: boolean;
  onReload: () => void;
}

/** Another save landed first (409). Nothing was overwritten; the text typed here stays on screen. */
export function ConflictNotice({ pending = false, onReload }: ConflictNoticeProps) {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/5 p-4"
    >
      <p className="font-medium">{t('author.editor.conflict.title')}</p>
      <p className="text-sm">{t('author.editor.conflict.description')}</p>
      <Button type="button" variant="outline" disabled={pending} onClick={onReload}>
        {t('author.editor.conflict.reload')}
      </Button>
    </div>
  );
}
