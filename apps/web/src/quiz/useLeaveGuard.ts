import { useEffect } from 'react';
import { useBlocker } from 'react-router';

/**
 * While `active`, asks before the scout leaves: in-app navigation is held by the returned
 * blocker (show a dialog, then `proceed()` or `reset()`), closing or reloading the tab
 * triggers the browser's own prompt.
 */
export function useLeaveGuard(active: boolean) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      active && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [active]);

  return blocker;
}
