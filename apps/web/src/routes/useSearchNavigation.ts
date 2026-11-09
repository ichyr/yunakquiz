import { createSearchParams, useNavigate } from 'react-router';

/** Submitting the search box opens the Search screen at its own, shareable address. */
export function useSearchNavigation() {
  const navigate = useNavigate();
  return (query: string) =>
    navigate({ pathname: '/search', search: `?${createSearchParams({ q: query })}` });
}
