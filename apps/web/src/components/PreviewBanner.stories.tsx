import type { Meta, StoryObj } from '@storybook/react-vite';
import { PreviewBanner } from './PreviewBanner.tsx';

const meta = {
  title: 'Author/PreviewBanner',
  component: PreviewBanner,
  args: { editTo: '/author/quizzes/vuzly' },
} satisfies Meta<typeof PreviewBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
