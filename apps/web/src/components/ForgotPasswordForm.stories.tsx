import type { Meta, StoryObj } from '@storybook/react-vite';
import { ApiError } from '@/api/client';
import { ForgotPasswordForm } from './ForgotPasswordForm.tsx';

const meta = {
  title: 'Account/ForgotPasswordForm',
  component: ForgotPasswordForm,
  args: { onSubmit: async () => {} },
} satisfies Meta<typeof ForgotPasswordForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const TooManyRequests: Story = {
  args: {
    onSubmit: async () => {
      throw new ApiError(429, '/password-reset/request', { method: 'POST' });
    },
  },
};
