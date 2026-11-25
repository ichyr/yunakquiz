import type { Meta, StoryObj } from '@storybook/react-vite';
import { Textarea } from './textarea';

const meta = {
  title: 'UI/Textarea',
  component: Textarea,
  args: { placeholder: 'Placeholder', 'aria-label': 'Example' },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Filled: Story = {
  args: { defaultValue: 'Ґудзик, вузол і ще один рядок.\nДругий рядок пояснення.' },
};
export const Invalid: Story = { args: { 'aria-invalid': true } };
export const Disabled: Story = { args: { disabled: true } };
