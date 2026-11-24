import type { Meta, StoryObj } from '@storybook/react-vite';
import { NotFoundState } from './NotFoundState.tsx';

const meta = {
  title: 'Status/NotFoundState',
  component: NotFoundState,
  args: { title: 'Вікторину не знайдено' },
} satisfies Meta<typeof NotFoundState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
