import type { Meta, StoryObj } from '@storybook/react-vite';
import { RadioGroup, RadioGroupItem } from './radio-group';

const meta = {
  title: 'UI/RadioGroup',
  component: RadioGroup,
  args: { defaultValue: 'b', 'aria-label': 'Example' },
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <RadioGroup {...args}>
      {['a', 'b', 'c'].map((value) => (
        <label key={value} className="flex items-center gap-2 text-sm">
          <RadioGroupItem value={value} />
          Option {value.toUpperCase()}
        </label>
      ))}
    </RadioGroup>
  ),
};
