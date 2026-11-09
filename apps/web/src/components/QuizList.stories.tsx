import type { Meta, StoryObj } from '@storybook/react-vite';
import { sampleQuizSummaries } from '@/fixtures';
import { QuizList } from './QuizList.tsx';

const meta = {
  title: 'Lists/QuizList',
  component: QuizList,
  args: { quizzes: sampleQuizSummaries },
} satisfies Meta<typeof QuizList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
