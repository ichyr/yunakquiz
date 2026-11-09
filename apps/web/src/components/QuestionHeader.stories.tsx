import type { Meta, StoryObj } from '@storybook/react-vite';
import { CheckIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { QuestionHeader } from './QuestionHeader.tsx';

const meta = {
  title: 'Quiz/QuestionHeader',
  component: QuestionHeader,
  decorators: [
    (Story) => (
      <Card className="mx-auto max-w-2xl">
        <Story />
      </Card>
    ),
  ],
  args: { prompt: 'Який вузол з’єднує дві мотузки?', number: 2, total: 5, language: 'uk' },
} satisfies Meta<typeof QuestionHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithAside: Story = {
  args: {
    aside: (
      <Badge className="bg-success text-success-foreground">
        <CheckIcon aria-hidden />
        Correct
      </Badge>
    ),
  },
};
