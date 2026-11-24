import type { Meta, StoryObj } from '@storybook/react-vite';
import { DocumentTitle } from './DocumentTitle.tsx';

/** Renders nothing visible: React hoists `<title>` into the document head. */
const meta = {
  title: 'Layout/DocumentTitle',
  component: DocumentTitle,
  args: { page: 'Іван Богун' },
} satisfies Meta<typeof DocumentTitle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithPage: Story = {};

/** Home, loading and offline show the app name alone. */
export const AppNameOnly: Story = { args: { page: undefined } };
