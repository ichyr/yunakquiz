import type { Meta, StoryObj } from '@storybook/react-vite';
import { toast } from 'sonner';
import { Button } from './button';
import { Toaster } from './sonner';

const meta = {
  title: 'UI/Toaster',
  component: Toaster,
  decorators: [
    (Story) => (
      <>
        <Story />
        <Button onClick={() => toast.error('Something went wrong.')}>Show error toast</Button>
      </>
    ),
  ],
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
