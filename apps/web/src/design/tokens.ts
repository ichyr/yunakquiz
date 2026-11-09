// Names of the design tokens defined in src/index.css, for the Storybook token pages.

export const colorTokens = [
  { name: 'background', pairedWith: 'foreground' },
  { name: 'card', pairedWith: 'card-foreground' },
  { name: 'primary', pairedWith: 'primary-foreground' },
  { name: 'secondary', pairedWith: 'secondary-foreground' },
  { name: 'muted', pairedWith: 'muted-foreground' },
  { name: 'accent', pairedWith: 'accent-foreground' },
  { name: 'success', pairedWith: 'success-foreground' },
  { name: 'success-subtle', pairedWith: 'foreground' },
  { name: 'destructive', pairedWith: 'destructive-foreground' },
  { name: 'destructive-subtle', pairedWith: 'foreground' },
  { name: 'border', pairedWith: 'foreground' },
  { name: 'input', pairedWith: 'foreground' },
  { name: 'ring', pairedWith: 'primary-foreground' },
] as const;

/** Tailwind spacing steps used in the app (1 step = 0.25rem). */
export const spacingSteps = [1, 2, 3, 4, 6, 8, 10] as const;

export const radiusTokens = ['sm', 'md', 'lg', 'xl'] as const;

export const typeScale = [
  { className: 'text-5xl font-bold', usage: 'Score' },
  { className: 'text-2xl font-bold tracking-tight', usage: 'Page title' },
  { className: 'text-lg font-semibold', usage: 'Section title' },
  { className: 'text-base font-semibold', usage: 'Question prompt' },
  { className: 'text-sm', usage: 'Body, Options, Explanations' },
  { className: 'text-xs font-medium uppercase tracking-wide', usage: 'Labels' },
] as const;
