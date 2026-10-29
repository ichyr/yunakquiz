import type { Category } from '@yunakquiz/core';
import { ChevronRightIcon } from 'lucide-react';
import { Link } from 'react-router';

export function CategoryList({ categories }: { categories: Category[] }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {categories.map((category) => (
        <li key={category.slug}>
          <Link
            to={`/categories/${category.slug}`}
            className="flex items-center justify-between gap-2 rounded-lg border bg-card px-4 py-3 font-medium shadow-xs transition-colors outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {category.name}
            <ChevronRightIcon aria-hidden className="size-4 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
