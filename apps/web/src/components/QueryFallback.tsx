import type { UseQueryResult } from '@tanstack/react-query';
import { isNotFound } from '@/api/client';
import { LoadErrorState } from '@/components/LoadErrorState';
import { LoadingState } from '@/components/LoadingState';
import { NotFoundState } from '@/components/NotFoundState';
import { OfflineState } from '@/components/OfflineState';

/**
 * What a page shows while its query has no data. Checked in order: paused (offline, so the
 * query waits for the network instead of failing), then error, then loading.
 */
export function QueryFallback({
  query,
  notFoundTitle,
}: {
  query: UseQueryResult;
  notFoundTitle?: string;
}) {
  if (query.isPaused) return <OfflineState />;
  if (query.isError) {
    if (notFoundTitle && isNotFound(query.error)) return <NotFoundState title={notFoundTitle} />;
    return <LoadErrorState onRetry={() => void query.refetch()} />;
  }
  return <LoadingState />;
}
