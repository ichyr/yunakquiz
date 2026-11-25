import type { Meta, StoryObj } from '@storybook/react-vite';
import { ApiError } from '@/api/client';
import { LoginForm } from './LoginForm.tsx';

const meta = {
  title: 'Account/LoginForm',
  component: LoginForm,
  args: { onSubmit: async () => {} },
} satisfies Meta<typeof LoginForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const WrongCredentials: Story = {
  args: {
    onSubmit: async () => {
      throw new ApiError(401, '/login', { method: 'POST', code: 'invalid_credentials' });
    },
  },
};
export const TooManyAttempts: Story = {
  args: {
    onSubmit: async () => {
      throw new ApiError(429, '/login', { method: 'POST' });
    },
  },
};
