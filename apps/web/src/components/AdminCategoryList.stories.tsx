import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { AdminCategoryList } from './AdminCategoryList.tsx';

const meta = {
  title: 'Admin/AdminCategoryList',
  component: AdminCategoryList,
  args: {
    onRename: fn(),
    onDelete: fn(),
    categories: [
      { id: 1, slug: 'istoriia-ukrainy', name: 'Історія України' },
      { id: 2, slug: 'patrony-kureniv', name: 'Патрони куренів' },
      { id: 3, slug: 'znannia', name: 'Знання' },
    ],
  },
} satisfies Meta<typeof AdminCategoryList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: { categories: [] },
};
