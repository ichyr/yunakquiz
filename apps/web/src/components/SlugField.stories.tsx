import type { Meta, StoryObj } from '@storybook/react-vite';
import type { DraftQuizInput } from '@yunakquiz/core';
import { useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { SlugField } from './SlugField.tsx';

function Host({
  title,
  slug,
  ...props
}: { title: string; slug: string } & React.ComponentProps<typeof SlugField>) {
  const form = useForm<DraftQuizInput>({ defaultValues: { title, slug } });
  return (
    <Form {...form}>
      <SlugField {...props} />
    </Form>
  );
}

const meta = {
  title: 'Author/SlugField',
  component: Host,
  args: {
    title: 'Іван Богун',
    slug: '',
    locked: false,
    checkSlug: async (): Promise<boolean> => true,
  },
} satisfies Meta<typeof Host>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const Available: Story = { args: { slug: 'ivan-bohun' } };
export const Taken: Story = { args: { slug: 'ivan-bohun', checkSlug: async () => false } };
export const Checking: Story = {
  args: { slug: 'ivan-bohun', checkSlug: () => new Promise<boolean>(() => {}) },
};
export const Invalid: Story = { args: { slug: 'Не латиниця' } };
export const Locked: Story = {
  args: { slug: 'ivan-bohun', persistedSlug: 'ivan-bohun', locked: true },
};
export const GenerateNeedsTitle: Story = { args: { title: '' } };
