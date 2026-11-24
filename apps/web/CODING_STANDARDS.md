# React coding standards

- Start independent requests in parallel; never await them one after another. ([async-parallel](../../.agents/skills/vercel-react-best-practices/rules/async-parallel.md))
- Import from the module itself, not through a barrel file. `lucide-react`, `radix-ui` and `@yunakquiz/core` are exempt: the production build tree-shakes them. ([bundle-barrel-imports](../../.agents/skills/vercel-react-best-practices/rules/bundle-barrel-imports.md))
- Load route pages lazily with React Router's `lazy` route property.
- Compute derived state while rendering; never sync it with an effect. ([rerender-derived-state-no-effect](../../.agents/skills/vercel-react-best-practices/rules/rerender-derived-state-no-effect.md))
- Never define a component inside another component. ([rerender-no-inline-components](../../.agents/skills/vercel-react-best-practices/rules/rerender-no-inline-components.md))
- Use functional `setState` when the next state depends on the previous one. ([rerender-functional-setstate](../../.agents/skills/vercel-react-best-practices/rules/rerender-functional-setstate.md))
- Use variants or composition instead of piles of boolean props. ([architecture-avoid-boolean-props](../../.agents/skills/vercel-composition-patterns/rules/architecture-avoid-boolean-props.md))

The full rule sets are in [vercel-react-best-practices](../../.agents/skills/vercel-react-best-practices/SKILL.md) and [vercel-composition-patterns](../../.agents/skills/vercel-composition-patterns/SKILL.md). This is a Vite app, so the `server-*` rules and other Next.js-only rules don't apply.

UI changes are checked against [web-design-guidelines](../../.agents/skills/web-design-guidelines/SKILL.md).
