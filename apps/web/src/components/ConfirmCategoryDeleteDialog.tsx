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

interface ConfirmCategoryDeleteDialogProps {
  /** The Category about to be deleted; null keeps the dialog closed. */
  category: { name: string } | null;
  pending?: boolean;
  /** Why the last try failed, shown inside the dialog. */
  errorText?: string | undefined;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Deleting a Category is permanent, so it asks first and is styled as destructive. */
export function ConfirmCategoryDeleteDialog({
  category,
  pending = false,
  errorText,
  onConfirm,
  onCancel,
}: ConfirmCategoryDeleteDialogProps) {
  const { t } = useTranslation();
  // Keep the name while the dialog animates closed.
  const name = category?.name ?? '';

  return (
    <AlertDialog open={category !== null} onOpenChange={(next) => !next && !pending && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('admin.categories.confirmTitle', { name })}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('admin.categories.confirmDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {errorText && (
          <p role="alert" className="text-sm text-destructive">
            {errorText}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t('admin.categories.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={(event) => {
              // Stay open until the request settles, so a failure can be shown here.
              event.preventDefault();
              onConfirm();
            }}
          >
            {pending ? t('admin.categories.working') : t('admin.categories.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
