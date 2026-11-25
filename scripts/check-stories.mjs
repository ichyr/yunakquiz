// Fails if a web component has no sibling story, e.g. Button.tsx without Button.stories.tsx.
// Scans every folder of apps/web/src, shadcn/ui primitives in components/ui/ included, because
// a component outside components/ needs a story too. oxlint has no Storybook plugin to do this.
//
// Exempt, by the rule in CLAUDE.md ("route pages, which only read params and call hooks"):
//   - route pages: they read the address, call a data hook and render components that have stories.
//     Mocking routers and data just to show them would add noise (ADR 0004).
//   - entry files that render no UI of their own: the app bootstrap and the route table.
import { existsSync, globSync } from 'node:fs';

const root = 'apps/web/src';
const routePages = [
  'routes/CategoryPage.tsx',
  'routes/HomePage.tsx',
  'routes/AccountPage.tsx',
  'routes/ConfirmEmailPage.tsx',
  'routes/LoginPage.tsx',
  'routes/QuizPage.tsx',
  'routes/RegisterPage.tsx',
  'routes/RootLayout.tsx',
  'routes/SearchPage.tsx',
  'routes/VerifyPage.tsx',
];
const entryFiles = ['main.tsx', 'router.tsx'];
const exempt = new Map([
  ...routePages.map((file) => [`${root}/${file}`, 'it is a route page']),
  ...entryFiles.map((file) => [`${root}/${file}`, 'it is an entry file']),
]);

const stale = [...exempt.keys()].filter((file) => !existsSync(file));
if (stale.length > 0) {
  console.error('Exempt from the story check, but not found (remove them from the list):');
  for (const file of stale) console.error(`  ${file}`);
  process.exit(1);
}

const components = globSync(`${root}/**/*.tsx`).filter(
  (file) => !file.endsWith('.stories.tsx') && !exempt.has(file),
);
const missing = components.filter((file) => !existsSync(file.replace(/\.tsx$/, '.stories.tsx')));

if (missing.length > 0) {
  console.error(
    'These components have no Storybook story. Every web component needs one; only route pages\n' +
      'and entry files are exempt (see scripts/check-stories.mjs and CLAUDE.md):',
  );
  for (const file of missing) console.error(`  ${file}`);
  process.exit(1);
}
console.log(`All ${components.length} components have a story (${exempt.size} exempt).`);
