// Fails if a web component has no sibling story, e.g. Button.tsx without Button.stories.tsx.
// Covers shadcn/ui primitives in components/ui/ too. oxlint has no Storybook plugin to do this.
import { existsSync, globSync } from 'node:fs';

const components = globSync('apps/web/src/components/**/*.tsx').filter(
  (file) => !file.endsWith('.stories.tsx'),
);
const missing = components.filter((file) => !existsSync(file.replace(/\.tsx$/, '.stories.tsx')));

if (missing.length > 0) {
  console.error('These components have no Storybook story:');
  for (const file of missing) console.error(`  ${file}`);
  process.exit(1);
}
console.log(`All ${components.length} components have a story.`);
