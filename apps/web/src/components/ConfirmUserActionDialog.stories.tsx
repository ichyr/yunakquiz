import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ConfirmUserActionDialog } from './ConfirmUserActionDialog.tsx';

const meta = {
  title: 'Admin/ConfirmUserActionDialog',
  component: ConfirmUserActionDialog,
  args: {
    action: { kind: 'delete', name: 'Олена' },
    onConfirm: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof ConfirmUserActionDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Delete: Story = {};
export const Promote: Story = { args: { action: { kind: 'promote', name: 'Олена' } } };
export const Demote: Story = { args: { action: { kind: 'demote', name: 'Олена' } } };
export const Pending: Story = { args: { pending: true } };
export const Failed: Story = {
  args: { errorText: 'Останнього адміністратора не можна понизити чи видалити.' },
};
