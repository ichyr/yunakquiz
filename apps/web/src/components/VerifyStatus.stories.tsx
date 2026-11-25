import type { Meta, StoryObj } from '@storybook/react-vite';
import { VerifyStatus } from './VerifyStatus.tsx';

const meta = {
  title: 'Account/VerifyStatus',
  component: VerifyStatus,
} satisfies Meta<typeof VerifyStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pending: Story = { args: { state: 'pending' } };
export const Success: Story = { args: { state: 'success' } };
export const Failure: Story = { args: { state: 'failure' } };
