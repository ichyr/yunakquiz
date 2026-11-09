import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './input';

const meta = {
  title: 'UI/Input',
  component: Input,
  args: { placeholder: 'Placeholder', 'aria-label': 'Example' },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Filled: Story = { args: { defaultValue: 'Іван Богун' } };
export const Invalid: Story = { args: { 'aria-invalid': true } };
export const Disabled: Story = { args: { disabled: true } };
