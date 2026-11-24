import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { SearchForm } from './SearchForm.tsx';

const meta = {
  title: 'Search/SearchForm',
  component: SearchForm,
  args: { onSearch: fn() },
} satisfies Meta<typeof SearchForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const Prefilled: Story = { args: { addressQuery: 'Богун' } };
