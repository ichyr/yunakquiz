import type { Meta, StoryObj } from '@storybook/react-vite';
import { OfflineState } from './OfflineState.tsx';

const meta = {
  title: 'Status/OfflineState',
  component: OfflineState,
} satisfies Meta<typeof OfflineState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
