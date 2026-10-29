import { AppLayout } from '@/components/AppLayout';
import { ErrorState } from '@/components/ErrorState';

/** Last resort for errors thrown while rendering a route. */
export function RouteErrorPage() {
  return (
    <AppLayout>
      <ErrorState onRetry={() => window.location.reload()} />
    </AppLayout>
  );
}
