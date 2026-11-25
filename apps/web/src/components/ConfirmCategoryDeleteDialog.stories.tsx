import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ConfirmCategoryDeleteDialog } from './ConfirmCategoryDeleteDialog.tsx';

const meta = {
  title: 'Admin/ConfirmCategoryDeleteDialog',
  component: ConfirmCategoryDeleteDialog,
  args: {
    category: { name: 'Історія України' },
    onConfirm: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof ConfirmCategoryDeleteDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Deleting: Story = {
  args: { pending: true },
};

export const Failed: Story = {
  args: { errorText: 'Щось пішло не так. Спробуйте ще раз.' },
};
