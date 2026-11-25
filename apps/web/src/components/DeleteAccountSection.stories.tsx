import type { Meta, StoryObj } from '@storybook/react-vite';
import { ApiError } from '@/api/client';
import { DeleteAccountSection } from './DeleteAccountSection.tsx';

const meta = {
  title: 'Account/DeleteAccountSection',
  component: DeleteAccountSection,
  args: { onDelete: async () => {} },
} satisfies Meta<typeof DeleteAccountSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};
export const Confirming: Story = { args: { defaultOpen: true } };
export const LastAdmin: Story = {
  args: {
    defaultOpen: true,
    onDelete: async () => {
      throw new ApiError(409, '/account/delete', { method: 'POST', code: 'last_admin' });
    },
  },
};
