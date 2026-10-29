import type { ReactNode } from 'react';

interface PageMessageProps {
  title: string;
  description?: string;
  action?: ReactNode;
  /** `status` for polite announcements (loading, empty), `alert` for errors. */
  role?: 'status' | 'alert';
}

/** A centred message in place of page content: empty, loading, error or not found. */
export function PageMessage({ title, description, action, role = 'status' }: PageMessageProps) {
  return (
    <div
      role={role}
      className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center"
    >
      <p className="font-medium">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}
