import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@/components/ui/button';
import { PageMessage } from './PageMessage.tsx';

const meta = {
  title: 'Status/PageMessage',
  component: PageMessage,
  args: { title: 'Nothing found. Try other words.' },
} satisfies Meta<typeof PageMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TitleOnly: Story = {};
export const WithDescriptionAndAction: Story = {
  args: {
    title: 'Something went wrong',
    description: 'Could not load the data.',
    action: <Button variant="outline">Retry</Button>,
    role: 'alert',
  },
};
