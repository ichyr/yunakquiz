import type { Meta, StoryObj } from '@storybook/react-vite';
import type { DraftQuizInput } from '@yunakquiz/core';
import { useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { CategoryPicker } from './CategoryPicker.tsx';

function Host({
  selected,
  invalid = false,
  ...props
}: { selected: string[]; invalid?: boolean } & React.ComponentProps<typeof CategoryPicker>) {
  const form = useForm<DraftQuizInput>({ defaultValues: { categories: selected } });
  if (invalid && !form.formState.errors.categories) {
    form.setError('categories', { type: 'issue', message: 'required' });
  }
  return (
    <Form {...form}>
      <CategoryPicker {...props} />
    </Form>
  );
}

const meta = {
  title: 'Author/CategoryPicker',
  component: Host,
  args: {
    selected: ['istoriia-ukrainy'],
    categories: [
      { slug: 'istoriia-ukrainy', name: 'Історія України' },
      { slug: 'patrony-kureniv', name: 'Патрони куренів' },
      { slug: 'znannia', name: 'Знання' },
    ],
  },
} satisfies Meta<typeof Host>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const NothingChosenError: Story = { args: { selected: [], invalid: true } };
export const NoCategories: Story = { args: { categories: [], selected: [] } };
