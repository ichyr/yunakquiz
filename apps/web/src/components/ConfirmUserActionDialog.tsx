import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { AdminUserAction } from './AdminUserList.tsx';

interface ConfirmUserActionDialogProps {
  /** What is about to happen to whom; null keeps the dialog closed. */
  action: { kind: AdminUserAction; name: string } | null;
  pending?: boolean;
  /** Why the last try failed, shown inside the dialog. */
  errorText?: string | undefined;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Promote, demote and delete all ask first. Deleting is permanent, so it is styled as such. */
export function ConfirmUserActionDialog({
  action,
  pending = false,
  errorText,
  onConfirm,
  onCancel,
}: ConfirmUserActionDialogProps) {
  const { t } = useTranslation();
  // Keep the last action while the dialog animates closed.
  const kind = action?.kind ?? 'delete';
  const name = action?.name ?? '';

  return (
    <AlertDialog open={action !== null} onOpenChange={(next) => !next && !pending && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t(`admin.confirm.${kind}Title`, { name })}</AlertDialogTitle>
          <AlertDialogDescription>{t(`admin.confirm.${kind}Description`)}</AlertDialogDescription>
        </AlertDialogHeader>
        {errorText && (
          <p role="alert" className="text-sm text-destructive">
            {errorText}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t('admin.confirm.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            variant={kind === 'delete' ? 'destructive' : 'default'}
            disabled={pending}
            onClick={(event) => {
              // Stay open until the request settles, so a failure can be shown here.
              event.preventDefault();
              onConfirm();
            }}
          >
            {pending ? t('admin.confirm.working') : t(`admin.confirm.${kind}`)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
