import type { Meta, StoryObj } from '@storybook/react-vite';
import { ApiError } from '@/api/client';
import { ChangePasswordForm } from './ChangePasswordForm.tsx';

const meta = {
  title: 'Account/ChangePasswordForm',
  component: ChangePasswordForm,
  args: { email: 'olena@example.com', displayName: 'Олена', onSubmit: async () => {} },
} satisfies Meta<typeof ChangePasswordForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WrongCurrentPassword: Story = {
  args: {
    onSubmit: async () => {
      throw new ApiError(403, '/account/password', {
        method: 'POST',
        code: 'invalid_current_password',
      });
    },
  },
};
