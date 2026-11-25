import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ConfirmQuizDeleteDialog } from './ConfirmQuizDeleteDialog.tsx';

const meta = {
  title: 'Author/ConfirmQuizDeleteDialog',
  component: ConfirmQuizDeleteDialog,
  args: { open: true, title: 'Вузли, які знає кожен скаут', onConfirm: fn(), onCancel: fn() },
} satisfies Meta<typeof ConfirmQuizDeleteDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Deleting: Story = { args: { pending: true } };
export const Failed: Story = { args: { errorText: 'Не вдалося видалити. Спробуйте ще раз.' } };
