import type { Meta, StoryObj } from '@storybook/react-vite';
import { ApiError } from '@/api/client';
import { SessionExpiredNotice } from './SessionExpiredNotice.tsx';

const meta = {
  title: 'Author/SessionExpiredNotice',
  component: SessionExpiredNotice,
  args: { onLogin: async () => {} },
} satisfies Meta<typeof SessionExpiredNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WrongCredentials: Story = {
  args: {
    onLogin: async () => {
      throw new ApiError(401, '/login', { method: 'POST', code: 'invalid_credentials' });
    },
  },
};
