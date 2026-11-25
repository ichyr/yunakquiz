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

interface ConfirmQuizDeleteDialogProps {
  open: boolean;
  /** The Quiz title shown in the question. */
  title: string;
  pending?: boolean;
  /** Why the last try failed, shown inside the dialog. */
  errorText?: string | undefined;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Deleting a Quiz is permanent (no trash, ADR 0009), so it asks first and is styled as destructive. */
export function ConfirmQuizDeleteDialog({
  open,
  title,
  pending = false,
  errorText,
  onConfirm,
  onCancel,
}: ConfirmQuizDeleteDialogProps) {
  const { t } = useTranslation();
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !pending && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('author.editor.delete.title', { title })}</AlertDialogTitle>
          <AlertDialogDescription>{t('author.editor.delete.description')}</AlertDialogDescription>
        </AlertDialogHeader>
        {errorText && (
          <p role="alert" className="text-sm text-destructive">
            {errorText}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {t('author.editor.delete.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={(event) => {
              // Stay open until the request settles, so a failure can be shown here.
              event.preventDefault();
              onConfirm();
            }}
          >
            {pending ? t('author.editor.delete.working') : t('author.editor.delete.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
