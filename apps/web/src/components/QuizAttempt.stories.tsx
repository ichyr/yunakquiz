import type { Meta, StoryObj } from '@storybook/react-vite';
import { sampleQuiz } from '@/fixtures';
import { QuizAttempt } from './QuizAttempt.tsx';

const meta = {
  title: 'Quiz/QuizAttempt',
  component: QuizAttempt,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div className="mx-auto max-w-2xl p-4">{Story()}</div>],
  args: { quiz: sampleQuiz },
} satisfies Meta<typeof QuizAttempt>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The real Attempt: answer every Question, Finish, read the Review, Try again. */
export const Default: Story = {};
