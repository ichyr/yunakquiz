import type { Meta, StoryObj } from '@storybook/react-vite';
import type { DraftQuizInput } from '@yunakquiz/core';
import { useForm } from 'react-hook-form';
import { fn } from 'storybook/test';
import { Form } from '@/components/ui/form';
import { QuestionFields } from './QuestionFields.tsx';

type Question = NonNullable<DraftQuizInput['questions']>[number];

function Host({
  question,
  invalid = false,
  ...props
}: { question: Question; invalid?: boolean } & React.ComponentProps<typeof QuestionFields>) {
  const form = useForm<DraftQuizInput>({ defaultValues: { questions: [question] } });
  if (invalid && !form.formState.errors.questions) {
    form.setError('questions.0.prompt', { type: 'issue', message: 'required' });
    form.setError('questions.0.options', { type: 'issue', message: 'one correct' });
    form.setError('questions.0.explanation', { type: 'issue', message: 'required' });
  }
  return (
    <Form {...form}>
      <QuestionFields {...props} />
    </Form>
  );
}

const meta = {
  title: 'Author/QuestionFields',
  component: Host,
  args: {
    index: 0,
    total: 1,
    onRemove: fn(),
    onMove: fn(),
    question: {
      prompt: 'Який вузол з’єднує дві мотузки однакової товщини?',
      options: [{ text: 'Прямий вузол', correct: true }, { text: 'Беседковий вузол' }],
      explanation: 'Прямий вузол з’єднує кінці однакової товщини.',
    },
  },
} satisfies Meta<typeof Host>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Blank: Story = {
  args: { question: { prompt: '', options: [{ text: '' }, { text: '' }], explanation: '' } },
};
export const WithErrors: Story = {
  args: {
    question: { prompt: '', options: [{ text: '' }, { text: '' }], explanation: '' },
    invalid: true,
  },
};
export const MiddleOfThree: Story = { args: { index: 0, total: 3 } };
