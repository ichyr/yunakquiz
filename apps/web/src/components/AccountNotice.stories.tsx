import type { Meta, StoryObj } from '@storybook/react-vite';
import { AccountNotice } from './AccountNotice.tsx';

const meta = {
  title: 'Account/AccountNotice',
  component: AccountNotice,
} satisfies Meta<typeof AccountNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unverified: Story = { args: { kind: 'unverified' } };
export const SessionExpired: Story = { args: { kind: 'sessionExpired' } };
