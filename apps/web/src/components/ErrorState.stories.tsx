import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ErrorState } from './ErrorState.tsx';

const meta = {
  title: 'Status/ErrorState',
  component: ErrorState,
} satisfies Meta<typeof ErrorState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Failed: Story = { args: { onRetry: fn() } };
export const NotFound: Story = { args: { notFound: true, title: 'Вікторину не знайдено' } };
