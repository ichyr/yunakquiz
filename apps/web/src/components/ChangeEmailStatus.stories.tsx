import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChangeEmailStatus } from './ChangeEmailStatus.tsx';

const meta = {
  title: 'Account/ChangeEmailStatus',
  component: ChangeEmailStatus,
} satisfies Meta<typeof ChangeEmailStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pending: Story = { args: { state: 'pending' } };
export const Success: Story = { args: { state: 'success' } };
export const Failure: Story = { args: { state: 'failure' } };
