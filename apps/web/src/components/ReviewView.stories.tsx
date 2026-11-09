import type { Meta, StoryObj } from '@storybook/react-vite';
import { chooseOption, finishAttempt } from '@yunakquiz/core';
import { fn } from 'storybook/test';
import { sampleAttempt, sampleReviewedAttempt } from '@/fixtures';
import { ReviewView } from './ReviewView.tsx';

const meta = {
  title: 'Review/ReviewView',
  component: ReviewView,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div className="mx-auto max-w-2xl p-4">{Story()}</div>],
  args: { attempt: sampleReviewedAttempt(), onTryAgain: fn() },
} satisfies Meta<typeof ReviewView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SomeIncorrect: Story = {};

export const Perfect: Story = {
  args: {
    attempt: finishAttempt(
      chooseOption(chooseOption(chooseOption(sampleAttempt(), 0, 0), 1, 1), 2, 1),
    ),
  },
};
