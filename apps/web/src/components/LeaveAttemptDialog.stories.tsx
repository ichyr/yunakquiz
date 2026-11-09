import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { LeaveAttemptDialog } from './LeaveAttemptDialog.tsx';

const meta = {
  title: 'Quiz/LeaveAttemptDialog',
  component: LeaveAttemptDialog,
  args: { open: true, onStay: fn(), onLeave: fn() },
} satisfies Meta<typeof LeaveAttemptDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {};
