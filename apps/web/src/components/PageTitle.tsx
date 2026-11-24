import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/** The visible `h1` of a page. Accepts `ref`, `lang` and `tabIndex` so focus can land on it. */
export function PageTitle({ className, children, ...props }: ComponentProps<'h1'>) {
  return (
    <h1
      className={cn(
        'min-w-0 text-2xl break-words font-bold tracking-tight focus:outline-none',
        className,
      )}
      {...props}
    >
      {children}
    </h1>
  );
}
