import type { Meta, StoryObj } from '@storybook/react-vite';
import { sampleQuiz } from '@/fixtures';
import { Explanation } from './Explanation.tsx';

const meta = {
  title: 'Review/Explanation',
  component: Explanation,
  args: { text: sampleQuiz.questions[1]!.explanation, language: 'en' },
} satisfies Meta<typeof Explanation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OneParagraph: Story = {};
export const SeveralParagraphs: Story = { args: { text: sampleQuiz.questions[0]!.explanation } };
