import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ConflictNotice } from './ConflictNotice.tsx';

const meta = {
  title: 'Author/ConflictNotice',
  component: ConflictNotice,
  args: { onReload: fn() },
} satisfies Meta<typeof ConflictNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Loading: Story = { args: { pending: true } };
