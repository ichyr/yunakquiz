import type { UseQueryResult } from '@tanstack/react-query';
import { isNotFound } from '@/api/client';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';

/** What a page shows while its query has no data: loading, not found, or a retryable error. */
export function QueryFallback({
  query,
  notFoundTitle,
}: {
  query: UseQueryResult;
  notFoundTitle?: string;
}) {
  if (!query.isError) return <LoadingState />;
  if (notFoundTitle && isNotFound(query.error)) {
    return <ErrorState notFound title={notFoundTitle} />;
  }
  return <ErrorState onRetry={() => void query.refetch()} />;
}
