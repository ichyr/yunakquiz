import type { Meta, StoryObj } from '@storybook/react-vite';
import type { AdminUser } from '@yunakquiz/core';
import { fn } from 'storybook/test';
import { AdminUserList } from './AdminUserList.tsx';

const user = (id: number, overrides: Partial<AdminUser> = {}): AdminUser => ({
  id,
  email: `scout${id}@example.com`,
  displayName: `Скаут ${id}`,
  role: 'user',
  verified: true,
  createdAt: '2026-03-14T10:00:00.000Z',
  quizCount: 0,
  ...overrides,
});

const meta = {
  title: 'Admin/AdminUserList',
  component: AdminUserList,
  args: {
    query: '',
    onSearch: fn(),
    onPageChange: fn(),
    onAction: fn(),
    page: {
      items: [
        user(1, { displayName: 'Олена Адмін', role: 'admin', email: 'olena@example.com' }),
        user(2),
        user(3, { verified: false }),
        user(4, { role: 'admin' }),
      ],
      total: 4,
      page: 1,
      pageSize: 20,
      adminCount: 2,
      actorId: 1,
    },
  },
} satisfies Meta<typeof AdminUserList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** One Admin left: nobody may demote or delete them, so their controls are hidden. */
export const LastAdmin: Story = {
  args: {
    page: {
      items: [user(1, { role: 'admin' }), user(2)],
      total: 2,
      page: 1,
      pageSize: 20,
      adminCount: 1,
      actorId: 1,
    },
  },
};

export const SecondPage: Story = {
  args: {
    page: {
      items: [user(21), user(22)],
      total: 42,
      page: 2,
      pageSize: 20,
      adminCount: 1,
      actorId: 1,
    },
  },
};

export const NothingFound: Story = {
  args: {
    query: 'нікого',
    page: { items: [], total: 0, page: 1, pageSize: 20, adminCount: 1, actorId: 1 },
  },
};
