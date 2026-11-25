import type { Meta, StoryObj } from '@storybook/react-vite';
import { ApiError } from '@/api/client';
import { ResetPasswordForm } from './ResetPasswordForm.tsx';

const meta = {
  title: 'Account/ResetPasswordForm',
  component: ResetPasswordForm,
  args: { onSubmit: async () => {} },
} satisfies Meta<typeof ResetPasswordForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const ExpiredLink: Story = {
  args: {
    onSubmit: async () => {
      throw new ApiError(400, '/password-reset/complete', {
        method: 'POST',
        code: 'invalid_token',
      });
    },
  },
};
export const WeakPasswordFromServer: Story = {
  args: {
    onSubmit: async () => {
      throw new ApiError(400, '/password-reset/complete', {
        method: 'POST',
        code: 'invalid_password',
        issues: ['contains_email'],
      });
    },
  },
};
