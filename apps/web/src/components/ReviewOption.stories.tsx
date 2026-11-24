import type { Meta, StoryObj } from '@storybook/react-vite';
import { ReviewOption } from './ReviewOption.tsx';

const meta = {
  title: 'Review/ReviewOption',
  component: ReviewOption,
  decorators: [(Story) => <ul>{Story()}</ul>],
  args: { text: 'Три листки конюшини', state: 'other', chosen: false, language: 'uk' },
} satisfies Meta<typeof ReviewOption>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Other: Story = {};
export const Wrong: Story = { args: { state: 'wrong', chosen: true } };
export const Correct: Story = { args: { state: 'correct' } };
export const CorrectAndChosen: Story = { args: { state: 'correct', chosen: true } };
