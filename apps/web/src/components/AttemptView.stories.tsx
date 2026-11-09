import type { Meta, StoryObj } from '@storybook/react-vite';
import { chooseOption } from '@yunakquiz/core';
import { fn } from 'storybook/test';
import { sampleAttempt, sampleQuiz } from '@/fixtures';
import { useAttempt } from '@/quiz/useAttempt';
import { AttemptView } from './AttemptView.tsx';

const meta = {
  title: 'Quiz/AttemptView',
  component: AttemptView,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div className="mx-auto max-w-2xl p-4">{Story()}</div>],
  args: {
    attempt: sampleAttempt(),
    onChoose: fn(),
    onFinish: fn(),
  },
} satisfies Meta<typeof AttemptView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unanswered: Story = {};

export const PartlyAnswered: Story = {
  args: { attempt: chooseOption(sampleAttempt(), 0, 0) },
};

export const ReadyToFinish: Story = {
  args: {
    attempt: chooseOption(chooseOption(chooseOption(sampleAttempt(), 0, 0), 1, 1), 2, 1),
  },
};

/** Answers are tracked by the real hook; Finish logs to Actions. */
export const Interactive: Story = {
  render: function Render(args) {
    const session = useAttempt(sampleQuiz);
    // Finish only logs here, so the Attempt never leaves the answering phase.
    if (session.attempt.phase !== 'answering') return <></>;
    return (
      <AttemptView attempt={session.attempt} onChoose={session.choose} onFinish={args.onFinish} />
    );
  },
};
