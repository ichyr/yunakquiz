import type { Meta, StoryObj } from '@storybook/react-vite';
import { ApiError } from '@/api/client';
import { DisplayNameForm } from './DisplayNameForm.tsx';

const meta = {
  title: 'Account/DisplayNameForm',
  component: DisplayNameForm,
  args: { currentName: 'Олена', onSubmit: async () => {} },
} satisfies Meta<typeof DisplayNameForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const NameTaken: Story = {
  args: {
    onSubmit: async () => {
      throw new ApiError(409, '/account/display-name', {
        method: 'POST',
        code: 'display_name_taken',
      });
    },
  },
};
