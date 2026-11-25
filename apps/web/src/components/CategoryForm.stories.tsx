import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { CategoryForm } from './CategoryForm.tsx';

const meta = {
  title: 'Admin/CategoryForm',
  component: CategoryForm,
  args: {
    mode: 'create',
    onSubmit: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof CategoryForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Create: Story = {};

export const Rename: Story = {
  args: { mode: 'rename', defaultName: 'Історія України' },
};

export const Saving: Story = {
  args: { mode: 'create', pending: true },
};

export const SlugTaken: Story = {
  args: { mode: 'create', errorText: 'Така адреса вже зайнята. Оберіть іншу.' },
};
