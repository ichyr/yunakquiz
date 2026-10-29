import type { Meta, StoryObj } from '@storybook/react-vite';
import { colorTokens, radiusTokens, spacingSteps, typeScale } from './tokens.ts';

const meta = {
  title: 'Design/Tokens',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Colours: Story = {
  render: () => (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-4">
      {colorTokens.map(({ name, pairedWith }) => (
        <figure key={name} className="flex flex-col gap-2">
          <div
            className="flex h-20 items-end rounded-lg border p-2 text-sm font-medium"
            style={{ background: `var(--${name})`, color: `var(--${pairedWith})` }}
          >
            Aa
          </div>
          <figcaption className="text-xs">
            <code className="font-semibold">--{name}</code>
            <br />
            <span className="text-muted-foreground">text: --{pairedWith}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  ),
};

export const Spacing: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {spacingSteps.map((step) => (
        <div key={step} className="flex items-center gap-4">
          <code className="w-28 text-xs">
            {step} · {step * 0.25}rem
          </code>
          <div className="h-4 rounded-sm bg-primary" style={{ width: `${step * 0.25}rem` }} />
        </div>
      ))}
    </div>
  ),
};

export const Radius: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6">
      {radiusTokens.map((radius) => (
        <figure key={radius} className="flex flex-col items-center gap-2">
          <div
            className="size-20 border-2 border-primary bg-accent"
            style={{ borderRadius: `var(--radius-${radius})` }}
          />
          <figcaption className="text-xs">
            <code>rounded-{radius}</code>
          </figcaption>
        </figure>
      ))}
    </div>
  ),
};

export const Typography: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Font: <code>Inter Variable</code> (Latin and Cyrillic), falling back to the system UI font.
      </p>
      {typeScale.map(({ className, usage }) => (
        <div key={className} className="flex flex-col gap-1">
          <code className="text-xs text-muted-foreground">
            {className} · {usage}
          </code>
          <p className={className}>Юнацтво вчиться · Scouts learn</p>
        </div>
      ))}
    </div>
  ),
};
