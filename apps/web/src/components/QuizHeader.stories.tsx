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

/** The Author display name sits under the title, in the Interface Language. */
export const WithAuthor: Story = { args: { author: { displayName: 'Олена Коваль' } } };

/** A seeded Quiz or one whose Author left: no Author line. */
export const Ownerless: Story = { args: { author: null } };
