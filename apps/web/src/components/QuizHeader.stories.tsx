import type { Meta, StoryObj } from '@storybook/react-vite';
import { sampleQuizSummaries } from '@/fixtures';
import { QuizHeader } from './QuizHeader.tsx';

const meta = {
  title: 'Quiz/QuizHeader',
  component: QuizHeader,
  args: { quiz: sampleQuizSummaries[0]! },
} satisfies Meta<typeof QuizHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
