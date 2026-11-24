import { AppLayout } from '@/components/AppLayout';
import { LoadErrorState } from '@/components/LoadErrorState';

/** Last resort for errors thrown while rendering a route. */
export function RouteErrorPage() {
  return (
    <AppLayout>
      <LoadErrorState onRetry={() => window.location.reload()} />
    </AppLayout>
  );
}
