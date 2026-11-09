import type { Meta, StoryObj } from '@storybook/react-vite';
import { SearchIcon } from 'lucide-react';
import { Button } from './button';

const meta = {
  title: 'UI/Button',
  component: Button,
  args: { children: 'Button' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: { control: 'select', options: ['default', 'sm', 'lg', 'icon'] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-2">
      <Button {...args}>Default</Button>
      <Button {...args} variant="secondary">
        Secondary
      </Button>
      <Button {...args} variant="outline">
        Outline
      </Button>
      <Button {...args} variant="ghost">
        Ghost
      </Button>
      <Button {...args} variant="link">
        Link
      </Button>
      <Button {...args} variant="destructive">
        Destructive
      </Button>
    </div>
  ),
};

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <SearchIcon /> Search
      </>
    ),
  },
};

export const Disabled: Story = { args: { disabled: true } };
