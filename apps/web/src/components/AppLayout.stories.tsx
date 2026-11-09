import type { Meta, StoryObj } from '@storybook/react-vite';
import { AppLayout } from './AppLayout.tsx';

const meta = {
  title: 'Layout/AppLayout',
  component: AppLayout,
  parameters: { layout: 'fullscreen' },
  args: { children: <p className="text-muted-foreground">Page content</p> },
} satisfies Meta<typeof AppLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
