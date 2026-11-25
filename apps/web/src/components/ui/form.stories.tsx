import type { Meta, StoryObj } from '@storybook/react-vite';
import { useForm } from 'react-hook-form';
import { Input } from './input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './form';

function Example({ invalid }: { invalid?: boolean }) {
  const form = useForm({ defaultValues: { name: '' } });
  if (invalid && !form.formState.errors.name) {
    form.setError('name', { message: 'Це поле обов’язкове.' });
  }
  return (
    <Form {...form}>
      <form className="grid max-w-sm gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ім’я</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>Показується як ім’я автора.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

const meta = { title: 'UI/Form', component: Example } satisfies Meta<typeof Example>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithError: Story = { args: { invalid: true } };
