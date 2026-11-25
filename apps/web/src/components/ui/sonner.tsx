import { Toaster as Sonner, type ToasterProps } from 'sonner';

/** App-wide toast outlet, styled with the design tokens. */
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="top-center"
      style={
        {
          '--normal-bg': 'var(--card)',
          '--normal-text': 'var(--card-foreground)',
          '--normal-border': 'var(--border)',
          '--error-bg': 'var(--destructive-subtle)',
          '--error-text': 'var(--destructive)',
          '--error-border': 'var(--destructive)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
}
