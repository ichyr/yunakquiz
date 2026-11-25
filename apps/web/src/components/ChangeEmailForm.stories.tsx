import type { Meta, StoryObj } from '@storybook/react-vite';
import { ApiError } from '@/api/client';
import { ChangeEmailForm } from './ChangeEmailForm.tsx';

const meta = {
  title: 'Account/ChangeEmailForm',
  component: ChangeEmailForm,
  args: { currentEmail: 'olena@example.com', onSubmit: async () => {} },
} satisfies Meta<typeof ChangeEmailForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WrongCurrentPassword: Story = {
  args: {
    onSubmit: async () => {
      throw new ApiError(403, '/account/email', {
        method: 'POST',
        code: 'invalid_current_password',
      });
    },
  },
};
