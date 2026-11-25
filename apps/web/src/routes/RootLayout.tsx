import { Outlet, ScrollRestoration } from 'react-router';
import { isSessionExpired } from '@/api/client';
import { useLogout, useMe } from '@/api/queries';
import { AccountMenu } from '@/components/AccountMenu';
import { AccountNotice } from '@/components/AccountNotice';
import { AppLayout } from '@/components/AppLayout';

export function RootLayout() {
  const me = useMe();
  const logout = useLogout();
  const account = me.data ?? null;
  const notice = isSessionExpired(me.error) ? (
    <AccountNotice kind="sessionExpired" />
  ) : account && !account.verified ? (
    <AccountNotice kind="unverified" />
  ) : undefined;

  return (
    <AppLayout
      account={<AccountMenu account={account} onLogout={() => logout.mutate()} />}
      notice={notice}
    >
      <Outlet />
      <ScrollRestoration />
    </AppLayout>
  );
}
