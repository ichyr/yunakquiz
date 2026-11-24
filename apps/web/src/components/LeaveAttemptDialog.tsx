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

interface LeaveAttemptDialogProps {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
}

export function LeaveAttemptDialog({ open, onStay, onLeave }: LeaveAttemptDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onStay()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('leave.title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('leave.description')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('leave.stay')}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={(event) => {
              // Closing would also call onStay, cancelling the leave. Leaving unmounts the dialog.
              event.preventDefault();
              onLeave();
            }}
          >
            {t('leave.leave')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
