import type { Meta, StoryObj } from '@storybook/react-vite';
import { LoadingState } from './LoadingState.tsx';

const meta = {
  title: 'Status/LoadingState',
  component: LoadingState,
} satisfies Meta<typeof LoadingState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
