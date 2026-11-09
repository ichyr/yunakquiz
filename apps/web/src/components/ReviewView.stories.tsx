import type { Meta, StoryObj } from '@storybook/react-vite';
import { buildReview, chooseOption } from '@yunakquiz/core';
import { fn } from 'storybook/test';
import { sampleAttempt, sampleQuiz, sampleReview } from '@/fixtures';
import { ReviewView } from './ReviewView.tsx';

const meta = {
  title: 'Review/ReviewView',
  component: ReviewView,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div className="mx-auto max-w-2xl p-4">{Story()}</div>],
  args: { quiz: sampleQuiz, review: sampleReview(), onTryAgain: fn() },
} satisfies Meta<typeof ReviewView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SomeIncorrect: Story = {};

export const Perfect: Story = {
  args: {
    review: buildReview(
      chooseOption(chooseOption(chooseOption(sampleAttempt(), 0, 0), 1, 1), 2, 1),
    ),
  },
};
