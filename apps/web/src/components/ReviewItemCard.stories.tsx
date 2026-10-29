import type { Meta, StoryObj } from '@storybook/react-vite';
import { sampleReview } from '@/fixtures';
import { ReviewItemCard } from './ReviewItemCard.tsx';

const [incorrect, correct] = sampleReview().items;

const meta = {
  title: 'Review/ReviewItemCard',
  component: ReviewItemCard,
  args: { item: correct!, number: 2, total: 3, language: 'en' },
} satisfies Meta<typeof ReviewItemCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Correct: Story = {};
export const Incorrect: Story = { args: { item: incorrect!, number: 1 } };
