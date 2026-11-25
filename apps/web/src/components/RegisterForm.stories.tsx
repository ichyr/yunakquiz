import type { Meta, StoryObj } from '@storybook/react-vite';
import { ApiError } from '@/api/client';
import { RegisterForm } from './RegisterForm.tsx';

const meta = {
  title: 'Account/RegisterForm',
  component: RegisterForm,
  args: { onSubmit: async () => {}, interfaceLanguage: 'uk' },
} satisfies Meta<typeof RegisterForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const DisplayNameTaken: Story = {
  args: {
    onSubmit: async () => {
      throw new ApiError(409, '/register', { method: 'POST', code: 'display_name_taken' });
    },
  },
};
export const WeakPasswordFromServer: Story = {
  args: {
    onSubmit: async () => {
      throw new ApiError(400, '/register', {
        method: 'POST',
        code: 'invalid_password',
        issues: ['common'],
      });
    },
  },
};
export const TooManyAttempts: Story = {
  args: {
    onSubmit: async () => {
      throw new ApiError(429, '/register', { method: 'POST' });
    },
  },
};
