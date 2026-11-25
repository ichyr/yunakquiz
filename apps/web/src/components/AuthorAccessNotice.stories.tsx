import type { Meta, StoryObj } from '@storybook/react-vite';
import { AuthorAccessNotice } from './AuthorAccessNotice.tsx';

const meta = {
  title: 'Author/AuthorAccessNotice',
  component: AuthorAccessNotice,
} satisfies Meta<typeof AuthorAccessNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Guest: Story = { args: { reason: 'guest' } };
export const Unverified: Story = { args: { reason: 'unverified' } };
