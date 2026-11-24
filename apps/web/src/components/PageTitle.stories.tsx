import type { Meta, StoryObj } from '@storybook/react-vite';
import { PageTitle } from './PageTitle.tsx';

const meta = {
  title: 'Layout/PageTitle',
  component: PageTitle,
  args: { children: 'Іван Богун' },
} satisfies Meta<typeof PageTitle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** `tabIndex={-1}` lets code move focus here without adding a tab stop. */
export const Focusable: Story = { args: { tabIndex: -1, lang: 'uk' } };
