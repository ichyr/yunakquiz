import type { Meta, StoryObj } from '@storybook/react-vite';
import { AuthorQuizList } from './AuthorQuizList.tsx';

const items = [
  {
    slug: 'vuzly',
    title: 'Вузли, які знає кожен скаут',
    language: 'uk',
    status: 'published',
    version: 3,
    author: { displayName: 'Олена' },
    publishedAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-20T10:00:00.000Z',
  },
  {
    slug: 'chernetka',
    title: '',
    language: '',
    status: 'draft',
    version: 1,
    author: null,
    publishedAt: null,
    updatedAt: '2026-11-24T10:00:00.000Z',
  },
] as const;

const meta = {
  title: 'Author/AuthorQuizList',
  component: AuthorQuizList,
  args: { quizzes: [...items], total: 2 },
} satisfies Meta<typeof AuthorQuizList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { quizzes: [], total: 0 } };
export const AdminSeesAuthors: Story = { args: { showAuthor: true } };
export const MorePagesExist: Story = { args: { total: 120 } };
