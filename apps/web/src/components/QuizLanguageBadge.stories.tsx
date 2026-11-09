import type { Meta, StoryObj } from '@storybook/react-vite';
import { QuizLanguageBadge } from './QuizLanguageBadge.tsx';

const meta = {
  title: 'Lists/QuizLanguageBadge',
  component: QuizLanguageBadge,
  args: { language: 'uk' },
} satisfies Meta<typeof QuizLanguageBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ukrainian: Story = {};
export const English: Story = { args: { language: 'en' } };
export const Polish: Story = { args: { language: 'pl' } };
