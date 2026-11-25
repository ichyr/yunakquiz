/** Fixed-window counter per key, in memory. Used for per-email limits on auth routes. */
export function createKeyedLimiter({
  max,
  windowMs,
  now = () => Date.now(),
}: {
  max: number;
  windowMs: number;
  now?: () => number;
}) {
  const windows = new Map<string, { count: number; resetAt: number }>();

  return {
    /** Counts one attempt. Returns false when the key is over the limit. */
    hit(key: string): boolean {
      const time = now();
      if (windows.size > 10_000) {
        for (const [k, w] of windows) if (w.resetAt <= time) windows.delete(k);
      }
      const existing = windows.get(key);
      if (!existing || existing.resetAt <= time) {
        windows.set(key, { count: 1, resetAt: time + windowMs });
        return true;
      }
      existing.count += 1;
      return existing.count <= max;
    },
  };
}
