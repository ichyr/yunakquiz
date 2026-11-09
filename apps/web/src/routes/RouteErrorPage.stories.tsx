import type { Meta, StoryObj } from '@storybook/react-vite';
import { RouteErrorPage } from './RouteErrorPage.tsx';

const meta = {
  title: 'Status/RouteErrorPage',
  component: RouteErrorPage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof RouteErrorPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
