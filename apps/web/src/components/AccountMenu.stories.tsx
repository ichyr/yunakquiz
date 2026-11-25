import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { AccountMenu } from './AccountMenu.tsx';

const account = {
  email: 'olena@example.com',
  displayName: 'Олена',
  role: 'user',
  verified: true,
  interfaceLanguage: 'uk',
} as const;

const meta = {
  title: 'Account/AccountMenu',
  component: AccountMenu,
  args: { onLogout: fn() },
} satisfies Meta<typeof AccountMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Guest: Story = { args: { account: null } };
export const SignedIn: Story = { args: { account } };
export const Admin: Story = { args: { account: { ...account, role: 'admin' } } };
export const LongName: Story = {
  args: { account: { ...account, displayName: 'Олена Коваленко-Шевченко з Полтавського куреня' } },
};
