import type { Meta, StoryObj } from '@storybook/react-vite';
import { sampleCategories } from '@/fixtures';
import { CategoryList } from './CategoryList.tsx';

const meta = {
  title: 'Lists/CategoryList',
  component: CategoryList,
  args: { categories: sampleCategories },
} satisfies Meta<typeof CategoryList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
