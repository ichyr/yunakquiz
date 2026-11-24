import type { UseQueryResult } from '@tanstack/react-query';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ApiError } from '@/api/client';
import { QueryFallback } from './QueryFallback.tsx';

// Only the fields QueryFallback reads, so stories need no QueryClient or API.
const queryWith = (state: { isError: boolean; isPaused?: boolean; error?: unknown }) =>
  ({ isPaused: false, ...state, refetch: fn() }) as unknown as UseQueryResult;

const meta = {
  title: 'Status/QueryFallback',
  component: QueryFallback,
  args: { query: queryWith({ isError: false }) },
} satisfies Meta<typeof QueryFallback>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {};

/** Offline: the query waits for the network, so there is nothing to retry. */
export const Offline: Story = {
  args: { query: queryWith({ isError: false, isPaused: true }) },
};

export const NotFound: Story = {
  args: {
    query: queryWith({ isError: true, error: new ApiError(404, '/quizzes/unknown') }),
    notFoundTitle: 'Вікторину не знайдено',
  },
};

export const Failed: Story = {
  args: { query: queryWith({ isError: true, error: new ApiError(500, '/quizzes/knots') }) },
};

/** A 404 on a page that has no "not found" title is just a failure to retry. */
export const NotFoundWithoutTitle: Story = {
  args: { query: queryWith({ isError: true, error: new ApiError(404, '/categories') }) },
};
