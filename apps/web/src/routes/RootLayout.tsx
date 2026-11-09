import { Outlet, ScrollRestoration } from 'react-router';
import { AppLayout } from '@/components/AppLayout';

export function RootLayout() {
  return (
    <AppLayout>
      <Outlet />
      <ScrollRestoration />
    </AppLayout>
  );
}
