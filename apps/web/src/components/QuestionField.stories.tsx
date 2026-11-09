import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { sampleAttempt } from '@/fixtures';
import { QuestionField } from './QuestionField.tsx';

const question = sampleAttempt().questions[0]!;

const meta = {
  title: 'Quiz/QuestionField',
  component: QuestionField,
  args: {
    question,
    number: 1,
    total: 3,
    language: 'en',
    chosenOptionId: undefined,
    onChoose: fn(),
  },
} satisfies Meta<typeof QuestionField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unanswered: Story = {};
export const Answered: Story = { args: { chosenOptionId: 1 } };
