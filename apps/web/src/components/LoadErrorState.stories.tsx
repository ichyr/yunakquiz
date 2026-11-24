import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { LoadErrorState } from './LoadErrorState.tsx';

const meta = {
  title: 'Status/LoadErrorState',
  component: LoadErrorState,
  args: { onRetry: fn() },
} satisfies Meta<typeof LoadErrorState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
